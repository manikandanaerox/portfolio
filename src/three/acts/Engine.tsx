"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Environment, PerspectiveCamera } from "@react-three/drei";
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { chapters } from "../../content";
import { useTheme } from "../../lib/theme";
import { blendAt, reducedMotion } from "../../lib/stage";
import { composeView, dampV, isPortrait, stepOf, type ActProps } from "./common";
import { DOT_FRAG, DOT_VERT, FLAME_FRAG, FLAME_VERT, PLUME_FRAG, PLUME_VERT, flameUniforms, plumeUniforms } from "./shaders";

/*
  Propulsion: a cutaway ATREX (expander-cycle air-turbo-ramjet), built procedurally
  as surfaces of revolution about +x, the flow direction.
    intake spike -> LH2 precooler -> fan with hydrogen tip turbine -> annular
    combustor with heat-exchanger coils -> convergent-divergent nozzle -> plume.
  A 110° wedge is cut out toward the camera; the cut faces are painted, as on a
  technical cutaway. Gas particles run through the duct with velocity from
  continuity (u ~ 1/A) and colour from a qualitative temperature history:
  ram-heated, chilled by the precooler, compressed, burnt, expanded.
  Scrolling flies the camera from station to station.
*/

const N = chapters.propulsion.steps.length;

// Duct outer wall (flow passage) and centre body, as (x, r) control points.
const WALL: [number, number][] = [
  [-2.95, 0.74], [-2.5, 0.73], [-2.05, 0.8], [-1.5, 0.8], [-1.15, 0.75], [-0.6, 0.71], [0.2, 0.71], [1.0, 0.7], [1.6, 0.66], [2.15, 0.44], [2.6, 0.53], [3.0, 0.6],
];
const SKIN: [number, number][] = [
  [-2.95, 0.8], [-2.55, 0.88], [-1.6, 0.93], [0, 0.93], [1.5, 0.88], [2.3, 0.74], [3.0, 0.66],
];
const BODY: [number, number][] = [
  [-3.45, 0.0], [-3.2, 0.1], [-2.85, 0.22], [-2.4, 0.33], [-2.0, 0.36], [-1.55, 0.31], [-1.15, 0.27], [-0.6, 0.25], [0.2, 0.23], [1.0, 0.19], [1.55, 0.11], [1.95, 0.0],
];

// Cut wedge centred on the camera side: direction (y, z) = (0.45, 0.9).
const PHI_C = Math.atan2(-0.45, 0.9);
const CUT = 1.9;
const PHI0 = PHI_C + CUT / 2;
const PHI_LEN = Math.PI * 2 - CUT;

function smoothProfile(pts: [number, number][], n = 140) {
  const curve = new THREE.CatmullRomCurve3(pts.map(([x, r]) => new THREE.Vector3(r, x, 0)), false, "centripetal");
  return curve.getPoints(n).map((v) => new THREE.Vector2(Math.max(0, v.x), v.y));
}

/** Piecewise-linear radius lookup along x. */
function radiusAt(pts: [number, number][], x: number) {
  if (x <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) {
    if (x <= pts[i][0]) {
      const [x0, r0] = pts[i - 1];
      const [x1, r1] = pts[i];
      return r0 + ((r1 - r0) * (x - x0)) / (x1 - x0);
    }
  }
  return pts[pts.length - 1][1];
}

/** Lathe about +x (three lathes about +y; rotateZ(-90°) maps y -> x). */
function lathe(points: THREE.Vector2[], cut: boolean, seg = 96) {
  const g = cut ? new THREE.LatheGeometry(points, seg, PHI0, PHI_LEN) : new THREE.LatheGeometry(points, seg);
  g.rotateZ(-Math.PI / 2);
  return g;
}

/** Ring about the x axis at station x, with the wedge cut. */
function cutRing(R: number, tube: number, x: number, cut = true) {
  const g = new THREE.TorusGeometry(R, tube, 6, 64, cut ? PHI_LEN : Math.PI * 2);
  if (cut) g.rotateZ(PHI0 + Math.PI);
  g.rotateY(Math.PI / 2);
  g.translate(x, 0, 0);
  return g;
}

/** Flat section face of a closed (x, r) profile, placed in the cut plane at angle phi. */
function cutFace(profile: THREE.Vector2[], phi: number) {
  const shape = new THREE.Shape(profile.map((p) => new THREE.Vector2(p.y, p.x)));
  const g = new THREE.ShapeGeometry(shape);
  g.rotateX(Math.atan2(Math.cos(phi), -Math.sin(phi)));
  return g;
}

// Camera keys per step: [position, target].
const KEYS: [THREE.Vector3, THREE.Vector3][] = [
  [new THREE.Vector3(-4.6, 3.8, 10.4), new THREE.Vector3(0.7, -0.1, 0)],
  [new THREE.Vector3(-6.3, 2.1, 4.6), new THREE.Vector3(-1.75, 0, 0)],
  [new THREE.Vector3(-3.7, 2.6, 4.0), new THREE.Vector3(-0.95, 0, 0)],
  [new THREE.Vector3(-0.7, 2.7, 4.4), new THREE.Vector3(0.95, 0, 0)],
  [new THREE.Vector3(2.0, 2.4, 5.8), new THREE.Vector3(4.0, 0, 0)],
  [new THREE.Vector3(-8.2, 5.8, 12.8), new THREE.Vector3(1.9, 0, 0)],
];

// Station emphasis per step: precooler frost, fan/tip turbine, flame, plume.
const EMPHASIS = [
  [0.5, 0.5, 0.6, 0.6],
  [1, 0.35, 0.4, 0.4],
  [0.55, 1, 0.5, 0.45],
  [0.45, 0.6, 1, 0.6],
  [0.4, 0.5, 0.8, 1],
  [0.55, 0.6, 0.8, 0.9],
];




/** Qualitative static temperature along the engine, 0 cold .. 1 hottest. */
function temperature(x: number) {
  if (x < -2.05) return 0.42; // ram-heated intake air
  if (x < -1.5) return THREE.MathUtils.lerp(0.42, 0.06, (x + 2.05) / 0.55); // precooler
  if (x < -0.7) return THREE.MathUtils.lerp(0.06, 0.28, (x + 1.5) / 0.8); // fan compression
  if (x < 0.25) return 0.28;
  if (x < 1.2) return THREE.MathUtils.lerp(0.28, 1.0, (x - 0.25) / 0.95); // combustion
  if (x < 3.0) return THREE.MathUtils.lerp(1.0, 0.72, (x - 1.2) / 1.8); // expansion
  return THREE.MathUtils.lerp(0.72, 0.35, Math.min(1, (x - 3.0) / 4));
}

const RAMP_DARK = ["#4c9dff", "#b9c7d6", "#ffb224", "#fff2d6"].map((c) => new THREE.Color(c));
const RAMP_LIGHT = ["#1d5fd1", "#5b6672", "#c26a00", "#9a2b00"].map((c) => new THREE.Color(c));
function ramp(t: number, stops: THREE.Color[], out: THREE.Color) {
  const s = Math.min(0.999, Math.max(0, t)) * (stops.length - 1);
  const i = Math.floor(s);
  return out.copy(stops[i]).lerp(stops[i + 1], s - i);
}

export function EngineAct({ stage }: ActProps) {
  const theme = useTheme();
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const reduce = useMemo(() => reducedMotion(), []);
  const mobile = typeof window !== "undefined" && window.innerWidth < 768;
  const COUNT = mobile ? 900 : 1900;

  const geo = useMemo(() => {
    const wall = smoothProfile(WALL);
    const skin = smoothProfile(SKIN);
    // Closed section: skin forward to aft, then wall aft to forward.
    const section = [...skin, ...wall.slice().reverse()];
    const casing = lathe(section, true, 120);
    const faces = mergeGeometries([cutFace(section, PHI0), cutFace(section, PHI0 + PHI_LEN)]);
    const body = lathe(smoothProfile(BODY), false, 72);

    const pre: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 7; i++) {
      const x = -2.02 + i * 0.075;
      const rin = radiusAt(BODY, x) + 0.05;
      const rout = radiusAt(WALL, x) - 0.03;
      for (let R = rin; R <= rout; R += 0.062) pre.push(cutRing(R, 0.011, x));
    }
    const precooler = mergeGeometries(pre);

    const blades: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 18; i++) {
      const b = new THREE.BoxGeometry(0.012, 0.46, 0.14);
      b.rotateY(0.7); // blade pitch
      b.translate(0, 0.27 + 0.23, 0);
      b.rotateX((i / 18) * Math.PI * 2);
      blades.push(b);
    }
    const fan = mergeGeometries(blades);
    fan.translate(-1.15, 0, 0);
    const hubDisc = new THREE.CylinderGeometry(0.28, 0.28, 0.1, 40).rotateZ(Math.PI / 2).translate(-1.15, 0, 0);

    const tips: THREE.BufferGeometry[] = [new THREE.CylinderGeometry(0.775, 0.775, 0.12, 64, 1, true).rotateZ(Math.PI / 2)];
    for (let i = 0; i < 40; i++) {
      const b = new THREE.BoxGeometry(0.01, 0.07, 0.05);
      b.rotateY(-0.6);
      b.translate(0, 0.815, 0);
      b.rotateX((i / 40) * Math.PI * 2);
      tips.push(b);
    }
    const tip = mergeGeometries(tips.map((g) => g.toNonIndexed()));
    tip.translate(-1.15, 0, 0);

    const hx: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 10; i++) hx.push(cutRing(radiusAt(WALL, 0.38 + i * 0.12) - 0.045, 0.016, 0.38 + i * 0.12));
    const coils = mergeGeometries(hx);

    const inj: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      const c = new THREE.CylinderGeometry(0.018, 0.024, 0.1, 10).rotateZ(Math.PI / 2);
      c.translate(0.24, -0.47 * Math.sin(a), 0.47 * Math.cos(a));
      inj.push(c);
    }
    const injectors = mergeGeometries(inj);

    // Flame shells inside the annulus.
    const shells = [0.32, 0.45, 0.58].map((f) => {
      const pts: THREE.Vector2[] = [];
      for (let i = 0; i <= 40; i++) {
        const x = 0.2 + (i / 40) * 1.5;
        const rin = radiusAt(BODY, x), rout = radiusAt(WALL, x) - 0.06;
        pts.push(new THREE.Vector2(rin + (rout - rin) * f, x));
      }
      return lathe(pts, false, 64);
    });
    const flame = mergeGeometries(shells);

    // One plane through the axis, turned to face the camera every frame (cylindrical billboard).
    const plume = new THREE.PlaneGeometry(4.8, 1.9);
    plume.translate(2.4 + 3.0, 0, 0);

    return { casing, faces, body, precooler, fan, hubDisc, tip, coils, injectors, flame, plume };
  }, []);

  const mat = useMemo(
    () => ({
      casing: new THREE.MeshStandardMaterial({ color: "#8f959d", metalness: 0.82, roughness: 0.34, side: THREE.DoubleSide }),
      face: new THREE.MeshStandardMaterial({ color: "#ffb224", metalness: 0.05, roughness: 0.62, side: THREE.DoubleSide }),
      body: new THREE.MeshStandardMaterial({ color: "#b9bfc7", metalness: 0.9, roughness: 0.24 }),
      precooler: new THREE.MeshStandardMaterial({ color: "#d6e8ff", metalness: 0.55, roughness: 0.3, emissive: new THREE.Color("#3f8cff") }),
      fan: new THREE.MeshStandardMaterial({ color: "#cdd2d9", metalness: 0.92, roughness: 0.2, side: THREE.DoubleSide }),
      copper: new THREE.MeshStandardMaterial({ color: "#b8733d", metalness: 1, roughness: 0.32, emissive: new THREE.Color("#ff5a14"), side: THREE.DoubleSide }),
      injector: new THREE.MeshStandardMaterial({ color: "#9aa1a9", metalness: 0.9, roughness: 0.3 }),
      flame: new THREE.ShaderMaterial({
        vertexShader: FLAME_VERT,
        fragmentShader: FLAME_FRAG,
        uniforms: flameUniforms("#ff6a1a", "#fff1c9", 0, [0.2, 0.55, 1.25, 1.7]),
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
      }),
      plume: new THREE.ShaderMaterial({
        vertexShader: PLUME_VERT,
        fragmentShader: PLUME_FRAG,
        uniforms: plumeUniforms("#ff7a1f", "#fff4dc"),
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
      }),
      dots: new THREE.ShaderMaterial({
        vertexShader: DOT_VERT,
        fragmentShader: DOT_FRAG,
        uniforms: { uScale: { value: 300 }, uOpacity: { value: 0.9 } },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    }),
    [],
  );

  // Gas particles.
  const gas = useMemo(() => {
    const pos = new Float32Array(COUNT * 3);
    const col = new Float32Array(COUNT * 3);
    const size = new Float32Array(COUNT);
    const st = new Float32Array(COUNT * 4); // x, radial fraction, angle, speed jitter
    for (let i = 0; i < COUNT; i++) {
      st[i * 4] = -3.4 + Math.random() * 11;
      st[i * 4 + 1] = 0.08 + Math.random() * 0.84;
      st[i * 4 + 2] = Math.random() * Math.PI * 2;
      st[i * 4 + 3] = 0.8 + Math.random() * 0.4;
      size[i] = 0.9 + Math.random() * 1.1;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute("color", new THREE.BufferAttribute(col, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute("size", new THREE.BufferAttribute(size, 1));
    return { g, st };
  }, [COUNT]);

  useEffect(
    () => () => {
      Object.values(geo).forEach((g) => g.dispose());
      Object.values(mat).forEach((m) => m.dispose());
      gas.g.dispose();
    },
    [geo, mat, gas],
  );

  // Theme: additive glow reads on dark; on the light page everything is drawn normally and darker.
  useEffect(() => {
    const dark = theme !== "light";
    const blend = dark ? THREE.AdditiveBlending : THREE.NormalBlending;
    for (const m of [mat.flame, mat.plume, mat.dots]) {
      m.blending = blend;
      m.needsUpdate = true;
    }
    mat.face.color.set(dark ? "#ffb224" : "#c77700");
    mat.casing.color.set(dark ? "#8f959d" : "#7c838c");
    (mat.plume.uniforms.uCore.value as THREE.Color).set(dark ? "#fff4dc" : "#ff9c3a");
    (mat.flame.uniforms.uCore.value as THREE.Color).set(dark ? "#fff1c9" : "#ff8a2a");
    (mat.flame.uniforms.uHot.value as THREE.Color).set(dark ? "#ff6a1a" : "#d24a00");
    (mat.plume.uniforms.uHot.value as THREE.Color).set(dark ? "#ff7a1f" : "#d24a00");
  }, [theme, mat]);

  const rotor = useRef<THREE.Group>(null);
  const engine = useRef<THREE.Group>(null);
  const plume = useRef<THREE.Mesh>(null);
  const local = useMemo(() => new THREE.Vector3(), []);
  const rig = useMemo(() => ({ pos: KEYS[0][0].clone(), tgt: KEYS[0][1].clone(), wantP: new THREE.Vector3(), wantT: new THREE.Vector3(), emph: [...EMPHASIS[0]], init: false }), []);
  const tmpC = useMemo(() => new THREE.Color(), []);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const t = state.clock.elapsedTime;
    const s = stepOf(stage, N);
    const { a, b, t: k } = blendAt(s, N);
    const portrait = isPortrait(camera);

    // Camera: blend the step keys, pull back on phones, then damp for weight.
    rig.wantP.lerpVectors(KEYS[a][0], KEYS[b][0], k);
    rig.wantT.lerpVectors(KEYS[a][1], KEYS[b][1], k);
    if (portrait) rig.wantP.sub(rig.wantT).multiplyScalar(2.25).add(rig.wantT);
    if (!reduce) rig.wantP.y += Math.sin(t * 0.25) * 0.12;
    if (!rig.init) {
      rig.pos.copy(rig.wantP);
      rig.tgt.copy(rig.wantT);
      rig.init = true;
    }
    dampV(rig.pos, rig.wantP, 3.2, dt);
    dampV(rig.tgt, rig.wantT, 3.2, dt);
    camera.position.copy(rig.pos);
    camera.lookAt(rig.tgt);
    composeView(camera, 0.2, 0.27);
    if (engine.current && plume.current) {
      local.copy(camera.position);
      engine.current.worldToLocal(local);
      plume.current.rotation.x = Math.atan2(-local.y, local.z);
    }

    // Station emphasis.
    for (let i = 0; i < 4; i++) rig.emph[i] = THREE.MathUtils.damp(rig.emph[i], THREE.MathUtils.lerp(EMPHASIS[a][i], EMPHASIS[b][i], k), 3, dt);
    const [frost, spin, burn, jet] = rig.emph;
    mat.precooler.emissiveIntensity = 0.15 + frost * 0.55;
    mat.copper.emissiveIntensity = 0.05 + burn * 0.45;
    mat.flame.uniforms.uTime.value = t;
    mat.flame.uniforms.uPower.value = 0.35 + burn * 0.75;
    mat.plume.uniforms.uTime.value = t;
    mat.plume.uniforms.uPower.value = 0.35 + jet * 0.75;
    if (rotor.current && !reduce) rotor.current.rotation.x += dt * (5 + spin * 9);

    // Gas: advance with continuity-derived speed; colour by temperature.
    const pos = gas.g.attributes.position.array as Float32Array;
    const col = gas.g.attributes.color.array as Float32Array;
    const st = gas.st;
    const stops = theme === "light" ? RAMP_LIGHT : RAMP_DARK;
    mat.dots.uniforms.uScale.value = state.size.height * state.viewport.dpr * 0.045;
    for (let i = 0; i < COUNT; i++) {
      let x = st[i * 4];
      const rf = st[i * 4 + 1];
      const phi = st[i * 4 + 2];
      let r: number;
      let v: number;
      if (x < 3.0) {
        const rin = radiusAt(BODY, x);
        const rout = radiusAt(WALL, x) - 0.02;
        r = rin + (rout - rin) * rf;
        v = 0.34 / Math.max(0.12, rout * rout - rin * rin); // u ~ 1/A
      } else {
        const d = x - 3.0;
        r = rf * (0.58 + d * 0.07) * (1 + 0.12 * Math.sin(d * 7.5));
        v = 1.25;
      }
      if (!reduce) x += Math.min(v, 2.4) * st[i * 4 + 3] * dt * 1.6;
      if (x > 7.6) x = -3.4 - Math.random() * 0.3;
      st[i * 4] = x;
      pos[i * 3] = x;
      pos[i * 3 + 1] = -r * Math.sin(phi);
      pos[i * 3 + 2] = r * Math.cos(phi);
      ramp(temperature(x), stops, tmpC);
      const fade = x > 6 ? 1 - (x - 6) / 1.6 : x < -3.1 ? (x + 3.4) / 0.3 : 1;
      col[i * 3] = tmpC.r * fade;
      col[i * 3 + 1] = tmpC.g * fade;
      col[i * 3 + 2] = tmpC.b * fade;
    }
    gas.g.attributes.position.needsUpdate = true;
    gas.g.attributes.color.needsUpdate = true;
  });

  return (
    <>
      <PerspectiveCamera makeDefault fov={32} near={0.1} far={80} position={KEYS[0][0].toArray()} />
      <Environment files="/hdri/studio_small_09_1k.hdr" environmentIntensity={0.85} />
      <ambientLight intensity={0.2} />
      <directionalLight position={[-3, 6, 5]} intensity={1.6} />
      <directionalLight position={[5, -2, -4]} intensity={0.6} color="#ffcf99" />

      <group ref={engine} rotation={[0.12, 0, 0]}>
        <mesh geometry={geo.casing} material={mat.casing} />
        <mesh geometry={geo.faces} material={mat.face} />
        <mesh geometry={geo.body} material={mat.body} />
        <mesh geometry={geo.precooler} material={mat.precooler} />
        <group ref={rotor}>
          <mesh geometry={geo.fan} material={mat.fan} />
          <mesh geometry={geo.hubDisc} material={mat.body} />
          <mesh geometry={geo.tip} material={mat.copper} />
        </group>
        <mesh geometry={geo.coils} material={mat.copper} />
        <mesh geometry={geo.injectors} material={mat.injector} />
        <mesh geometry={geo.flame} material={mat.flame} renderOrder={2} />
        <mesh ref={plume} geometry={geo.plume} material={mat.plume} renderOrder={3} />
        <points geometry={gas.g} material={mat.dots} frustumCulled={false} renderOrder={4} />
      </group>
    </>
  );
}
