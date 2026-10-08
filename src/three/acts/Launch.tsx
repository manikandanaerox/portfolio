"use client";

import { Suspense, useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer, PerspectiveCamera, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { useTheme } from "../../lib/theme";
import { clamp01, pinProgress, reducedMotion, smootherstep } from "../../lib/stage";
import { PLUME_FRAG, PLUME_VERT, plumeUniforms } from "./shaders";
import type { ActProps } from "./common";
import { PhoenixDecal } from "./PhoenixDecal";
import { SKY_FRAG, SKY_VERT, skyUniforms } from "./launch/sky";
import { concrete, ground, puff } from "./launch/textures";

/*
  Hero: a night launch of SLS / Artemis II from a Mobile Launcher, scrubbed by
  scroll (progress p through the pinned hero).
    p 0.00  on the pad, cryogenic propellants venting off the core stage
    p 0.06  the Orion crew access arm swings away
    p 0.13  RS-25 ignition: four hydrogen/oxygen engines, a near-transparent plume
            with shock diamonds; steam pours out of the flame trench
    p 0.195 solid rocket boosters ignite, umbilicals retract, liftoff at p 0.20:
            constant acceleration until clear of the tower, then a smooth,
            accelerating ascent and a gravity-turn pitch-over
    p 0.78  booster separation: the spent boosters peel away and fall behind
  The vehicle is public/models/sls.glb, converted from the ArtemisIIFinal FBX
  (PBR textures packed, meshopt + WebP). Its parts are separate nodes, so the
  boosters separate cleanly. The Mobile Launcher and pad are built here.
  Smoke is a deterministic function of p (birth progress + age), so scrolling back
  un-launches cleanly. The camera is a ground tracking camera with a long lens:
  it stays put and zooms to keep the vehicle framed, as in real launch footage.
*/

// ---- the vehicle model ----
const MODEL_URL = "/models/sls.glb";
useGLTF.preload(MODEL_URL, false, true);
// Model units (~112 per metre): booster nozzle exits at y = -5684, launch-abort tower tip at 5265.
const S = 7.4 / 10949;
const BASE = -5684;
const SRB_X = 707 * S; // booster axes
const SRB_C = (-2661 - BASE) * S; // booster mid-height above the vehicle base (pivot after separation)
const RS25_Y = (-5635 - BASE) * S; // core engine exit plane
const CORE = ["main_tank", "tower", "piping", "RS25_engines", "SRB_attachments"];
const SRB_RIGHT = ["solid_rocket_booster1"]; // +x
const SRB_LEFT = ["solid_rocket_booster2"]; // -x

// ---- Mobile Launcher (scene units, 1 unit ~ 13 m) ----
const ML_H = 0.58; // deck height above the pad
const ML_TOWER_Z = -1.25; // umbilical tower behind the vehicle
const ML_TOWER_W = 0.9;
const ML_TOWER_H = 8.2;
const ORION_Y = ML_H + (3300 - BASE) * S; // crew access arm level
const TOWER_TOP: [number, number, number] = [0, ML_H + ML_TOWER_H + 1.6, ML_TOWER_Z];

/** Named parts of the vehicle model, placed with the vehicle base at the origin. */
function VehiclePart({ names, offset = [0, 0, 0] }: { names: string[]; offset?: [number, number, number] }) {
  const { scene } = useGLTF(MODEL_URL, false, true);
  const object = useMemo(() => {
    const g = new THREE.Group();
    for (const n of names) {
      const o = scene.getObjectByName(n);
      if (o) g.add(o.clone());
    }
    g.traverse((m) => {
      const mesh = m as THREE.Mesh;
      if (mesh.isMesh) (mesh.material as THREE.MeshStandardMaterial).envMapIntensity = 1.3;
    });
    return g;
  }, [scene, names]);
  return (
    <group position={[offset[0], offset[1] - BASE * S, offset[2]]} scale={S}>
      <primitive object={object} />
    </group>
  );
}

const P_IGN = 0.13;
const P_SRB = 0.195;
const P_LIFT = 0.2;
const P_SEP = 0.78;
const CLEAR_DP = 0.14; // progress spent getting clear of the tower
const CLEAR_H = 12; // tower top is ~8.8 above the pad
const CLEAR_V = (2 * CLEAR_H) / CLEAR_DP; // dh/dp at the hand-over
const ASCENT_K = (1400 - CLEAR_H - CLEAR_V * (1 - P_LIFT - CLEAR_DP)) / Math.pow(1 - P_LIFT - CLEAR_DP, 3);
const SECONDS_PER_P = 60; // smoke ages as if the hero lasted a minute of flight

// Floodlight heads (on the poles).
const FLOODS: [number, number, number][] = [[4.5, 3.3, 5.1], [-4.5, 3.3, 5.1], [5.5, 3.3, -2.9]];

const BEAM_VERT = /* glsl */ `
  varying float vAlong; varying vec3 vN; varying vec3 vV;
  void main() {
    vAlong = 1.0 - uv.y;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;
const BEAM_FRAG = /* glsl */ `
  uniform float uPower; uniform vec3 uColor;
  varying float vAlong; varying vec3 vN; varying vec3 vV;
  void main() {
    float edge = pow(abs(dot(vN, vV)), 1.6);       // soft cone edges
    float a = pow(1.0 - vAlong, 1.6) * edge * uPower;
    gl_FragColor = vec4(uColor * a, a);
  }
`;

const SMOKE_VERT = /* glsl */ `
  attribute vec4 aData; // alpha, warmth, rotation, light-from-below
  varying vec2 vUv;
  varying vec4 vData;
  void main() {
    vUv = uv;
    vData = aData;
    vec4 c = modelViewMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
    float s = length(instanceMatrix[0].xyz);
    float cr = cos(aData.z), sr = sin(aData.z);
    c.xy += mat2(cr, sr, -sr, cr) * position.xy * s;
    gl_Position = projectionMatrix * c;
  }
`;
const SMOKE_FRAG = /* glsl */ `
  uniform sampler2D uPuff; uniform vec3 uSmoke; uniform vec3 uShade; uniform vec3 uFire;
  varying vec2 vUv;
  varying vec4 vData;
  void main() {
    float a = texture2D(uPuff, vUv).a * vData.x;
    if (a < 0.004) discard;
    // Lit by the plume from below; self-shadowed at the top.
    vec3 col = mix(uShade, uSmoke, smoothstep(0.0, 1.0, vUv.y * 0.6 + 0.3));
    col = mix(col, uFire, vData.y * (1.0 - vUv.y * 0.6));
    gl_FragColor = vec4(col * a, a);
  }
`;

const GLOW_FRAG = /* glsl */ `
  uniform vec3 uColor; uniform float uPower;
  varying vec2 vUv;
  void main() {
    float r = length(vUv - 0.5) * 2.0;
    float a = exp(-r * r * 5.0) * uPower;
    gl_FragColor = vec4(uColor * a, a);
  }
`;

/** Rocket state for progress p. */
function flight(p: number) {
  // RS-25s start at P_IGN and run through; the solids light at P_SRB and burn out at separation.
  const core = smootherstep((p - P_IGN) / 0.05);
  const srb = p >= P_SRB && p < P_SEP ? smootherstep((p - P_SRB) / 0.008) : 0;
  // Liftoff: constant acceleration until the stack clears the tower (h = 12 at p = 0.34),
  // then a cubic ascent with matched velocity, so the climb never stalls or lurches.
  const tau = clamp01((p - P_LIFT) / CLEAR_DP);
  const after = Math.max(0, p - P_LIFT - CLEAR_DP);
  const h = p <= P_LIFT ? 0 : after === 0 ? CLEAR_H * tau * tau : CLEAR_H + CLEAR_V * after + ASCENT_K * after * after * after;
  const pitch = 0.42 * smootherstep((p - 0.36) / 0.6);
  const downrange = h * 0.42 * Math.pow(smootherstep((p - 0.36) / 0.64), 1.5);
  return { core, srb, h, pitch, downrange };
}

const Z_AXIS = new THREE.Vector3(0, 0, 1);
const PAD_CLOUD = 230;
const TRAIL = 520;
const VENT = 28;

export function LaunchAct({ stage }: ActProps) {
  const theme = useTheme();
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const reduce = useMemo(() => reducedMotion(), []);
  const mobile = typeof window !== "undefined" && window.innerWidth < 768;

  const tex = useMemo(() => {
    const t = { deck: concrete(), ground: ground(), puff: puff() };
    t.deck.repeat.set(3, 3);
    t.ground.repeat.set(380, 380);
    return t;
  }, []);

  const geo = useMemo(() => {
    const masts: THREE.BufferGeometry[] = [];
    for (const [x, z] of [[-7, -6], [7, -6], [-6, -13], [6, -13]] as const) masts.push(new THREE.CylinderGeometry(0.05, 0.09, 13, 8).translate(x, 6.5, z));
    const mast = mergeGeometries(masts);

    // Floodlight poles.
    const poles: THREE.BufferGeometry[] = [];
    for (const [x, z] of [[4.5, 5], [-4.5, 5], [5.5, -3]] as const) {
      poles.push(new THREE.CylinderGeometry(0.04, 0.05, 3.2, 8).translate(x, 1.6, z));
      poles.push(new THREE.BoxGeometry(0.5, 0.3, 0.18).translate(x, 3.3, z));
    }
    const pole = mergeGeometries(poles);

    // Plumes hang below their engine planes (local x of the plane -> -y).
    const plumeCore = new THREE.PlaneGeometry(4.6, 0.9).translate(2.3, 0, 0).rotateZ(-Math.PI / 2);
    const plumeSrb = new THREE.PlaneGeometry(6.8, 0.95).translate(3.4, 0, 0).rotateZ(-Math.PI / 2);

    // Mobile Launcher: base platform on six pedestals, umbilical tower, lightning mast.
    const mlBase = mergeGeometries([
      new THREE.BoxGeometry(3.8, ML_H - 0.12, 3.2).translate(0, ML_H / 2 + 0.06, -0.4),
      ...[-1.5, 0, 1.5].flatMap((x) => [-1.6, 0.8].map((z) => new THREE.BoxGeometry(0.22, 0.14, 0.22).translate(x, 0.07, z))),
    ]);
    const members: THREE.BufferGeometry[] = [];
    const TW = ML_TOWER_W, TH = ML_TOWER_H, y0 = ML_H;
    const col = (x: number, z: number) => members.push(new THREE.BoxGeometry(0.06, TH, 0.06).translate(x, y0 + TH / 2, z));
    col(-TW / 2, -TW / 2); col(TW / 2, -TW / 2); col(-TW / 2, TW / 2); col(TW / 2, TW / 2);
    const d = Math.hypot(TW, 0.55);
    for (let y = y0 + 0.55; y < y0 + TH; y += 0.55) {
      for (const z of [-TW / 2, TW / 2]) members.push(new THREE.BoxGeometry(TW, 0.035, 0.035).translate(0, y, z));
      for (const x of [-TW / 2, TW / 2]) members.push(new THREE.BoxGeometry(0.035, 0.035, TW).translate(x, y, 0));
      members.push(new THREE.BoxGeometry(0.025, d, 0.025).rotateZ(Math.atan2(TW, 0.55)).translate(0, y - 0.275, -TW / 2));
      members.push(new THREE.BoxGeometry(0.025, d, 0.025).rotateZ(-Math.atan2(TW, 0.55)).translate(0, y - 0.275, TW / 2));
      members.push(new THREE.BoxGeometry(0.025, d, 0.025).rotateX(Math.atan2(TW, 0.55)).translate(-TW / 2, y - 0.275, 0));
      members.push(new THREE.BoxGeometry(0.025, d, 0.025).rotateX(-Math.atan2(TW, 0.55)).translate(TW / 2, y - 0.275, 0));
    }
    // Floors every few levels (the tower's work platforms) and the lightning mast on top.
    for (let y = y0 + 1.1; y < y0 + TH; y += 1.1) members.push(new THREE.BoxGeometry(TW + 0.08, 0.05, TW + 0.08).translate(0, y, 0));
    members.push(new THREE.CylinderGeometry(0.025, 0.06, 1.6, 8).translate(0, y0 + TH + 0.8, 0));
    const mlTower = mergeGeometries(members);
    mlTower.translate(0, 0, ML_TOWER_Z);
    const glow = new THREE.PlaneGeometry(1, 1);
    // Searchlight beams from the floodlight poles to the vehicle.
    const beams = mergeGeometries(
      FLOODS.map(([x, y, z]) => {
        const from = new THREE.Vector3(x, y, z);
        const to = new THREE.Vector3(0, 4.4, 0);
        const L = from.distanceTo(to) * 1.25;
        const g = new THREE.CylinderGeometry(0.12, 1.5, L, 28, 1, true).translate(0, -L / 2, 0);
        g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), to.clone().sub(from).normalize()));
        return g.translate(x, y, z);
      }),
    );
    // Distant hills on the horizon.
    const hills = new THREE.CylinderGeometry(1500, 1500, 1, 256, 1, true);
    const hp = hills.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < hp.count; i++) {
      const a = Math.atan2(hp.getZ(i), hp.getX(i));
      const top = hp.getY(i) > 0;
      const n = Math.sin(a * 7) * 0.5 + Math.sin(a * 17 + 1.3) * 0.3 + Math.sin(a * 41 + 0.7) * 0.2;
      hp.setY(i, top ? 6 + 16 * (0.5 + 0.5 * n) : -3);
    }
    hills.computeVertexNormals();
    // Space-centre lights scattered across the plain.
    const lightPos: number[] = [];
    const lightCol: number[] = [];
    const palette = [new THREE.Color("#ffb070"), new THREE.Color("#ffd9a3"), new THREE.Color("#e6eeff"), new THREE.Color("#ff4a3a")];
    for (let i = 0; i < 320; i++) {
      const a = -Math.PI * 0.95 + Math.random() * Math.PI * 1.1;
      const r = 120 + Math.pow(Math.random(), 0.6) * 1100;
      lightPos.push(Math.cos(a) * r, 0.3 + Math.random() * (Math.random() < 0.08 ? 30 : 3), Math.sin(a) * r);
      const c = palette[Math.random() < 0.06 ? 3 : Math.floor(Math.random() * 3)];
      lightCol.push(c.r, c.g, c.b);
    }
    const lights = new THREE.BufferGeometry();
    lights.setAttribute("position", new THREE.Float32BufferAttribute(lightPos, 3));
    lights.setAttribute("color", new THREE.Float32BufferAttribute(lightCol, 3));
    return { mast, pole, plumeCore, plumeSrb, glow, beams, hills, lights, mlBase, mlTower };
  }, []);

  const mat = useMemo(() => {
    const plume = (hot: string, core: string, o: Parameters<typeof plumeUniforms>[2]) =>
      new THREE.ShaderMaterial({
        vertexShader: PLUME_VERT,
        fragmentShader: PLUME_FRAG,
        uniforms: plumeUniforms(hot, core, o),
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
      });
    const glow = (c: string) =>
      new THREE.ShaderMaterial({
        vertexShader: PLUME_VERT,
        fragmentShader: GLOW_FRAG,
        uniforms: { uColor: { value: new THREE.Color(c) }, uPower: { value: 0 } },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
    return {
      steel: new THREE.MeshStandardMaterial({ color: "#4b5059", metalness: 0.7, roughness: 0.55 }),
      deck: new THREE.MeshStandardMaterial({ map: tex.deck, color: "#9a9ca0", roughness: 0.92, metalness: 0 }),
      ground: new THREE.MeshStandardMaterial({ map: tex.ground, color: "#ffffff", roughness: 1, metalness: 0 }),
      hills: new THREE.MeshBasicMaterial({ color: "#07090c", side: THREE.DoubleSide }),
      trench: new THREE.MeshBasicMaterial({ color: "#050506" }),
      siteLights: new THREE.PointsMaterial({ size: 2.2, sizeAttenuation: false, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }),
      beam: new THREE.ShaderMaterial({
        vertexShader: BEAM_VERT,
        fragmentShader: BEAM_FRAG,
        uniforms: { uPower: { value: 0.07 }, uColor: { value: new THREE.Color("#fff1d6") } },
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
      }),
      redLight: new THREE.MeshBasicMaterial({ color: "#ff3b2f" }),
      flood: new THREE.MeshBasicMaterial({ color: "#fff3d6" }),
      sky: new THREE.ShaderMaterial({
        vertexShader: SKY_VERT,
        fragmentShader: SKY_FRAG,
        uniforms: skyUniforms(),
        side: THREE.BackSide,
        depthWrite: false,
      }),
      // RS-25 (hydrogen/oxygen): near-transparent blue-white with crisp shock diamonds.
      plumeCore: plume("#6f8dff", "#fff6ef", { cell: 0.12, diamond: 1.15, spread: 0.35, decay: 2.1 }),
      // Solid boosters: blinding orange-white, turbulent, few diamonds.
      plumeSrb: plume("#ff8a2a", "#fff8ea", { cell: 0.2, diamond: 0.18, spread: 1.1, decay: 1.25 }),
      glowCore: glow("#9fb6ff"),
      glowSrb: glow("#ffb25c"),
      mlGrey: new THREE.MeshStandardMaterial({ color: "#5a5f66", roughness: 0.75, metalness: 0.35 }),
      white: new THREE.MeshStandardMaterial({ color: "#d9dbdd", roughness: 0.6, metalness: 0.1 }),
      smoke: new THREE.ShaderMaterial({
        vertexShader: SMOKE_VERT,
        fragmentShader: SMOKE_FRAG,
        uniforms: { uPuff: { value: tex.puff }, uSmoke: { value: new THREE.Color("#b9bcc2") }, uShade: { value: new THREE.Color("#4d5158") }, uFire: { value: new THREE.Color("#ff9a4a") } },
        transparent: true,
        depthWrite: false,
        premultipliedAlpha: true,
      }),
    };
  }, [tex]);

  // Theme: night launch on dark, day launch on light.
  useEffect(() => {
    const night = theme !== "light";
    const u = mat.sky.uniforms;
    (u.uHorizon.value as THREE.Color).set(night ? "#16202e" : "#cfdbe6");
    (u.uZenith.value as THREE.Color).set(night ? "#020308" : "#4f86c6");
    (u.uGlow.value as THREE.Color).set(night ? "#4a3a2e" : "#f2e6d6");
    u.uNight.value = night ? 1 : 0;
    mat.ground.color.set(night ? "#1c1e1b" : "#c9cbbf");
    mat.deck.color.set(night ? "#8a8c90" : "#d2d3d4");
    mat.hills.color.set(night ? "#06080b" : "#8d988a");
    mat.beam.uniforms.uPower.value = night ? 0.07 : 0;
    mat.siteLights.opacity = night ? 1 : 0;
    (mat.smoke.uniforms.uSmoke.value as THREE.Color).set(night ? "#a9adb4" : "#f2f3f4");
    (mat.smoke.uniforms.uShade.value as THREE.Color).set(night ? "#3c4047" : "#b4b8be");
    for (const m of [mat.plumeCore, mat.plumeSrb]) {
      m.blending = night ? THREE.AdditiveBlending : THREE.NormalBlending;
      m.premultipliedAlpha = !night;
      m.needsUpdate = true;
    }
  }, [theme, mat]);

  useEffect(
    () => () => {
      Object.values(geo).forEach((g) => g.dispose());
      Object.values(mat).forEach((m) => m.dispose());
      Object.values(tex).forEach((t) => t.dispose());
    },
    [geo, mat, tex],
  );

  // Smoke particles: birth progress, seeds and kind, fixed at mount.
  const smoke = useMemo(() => {
    const n = (mobile ? 0.6 : 1) * (PAD_CLOUD + TRAIL) + VENT;
    const count = Math.round(n);
    const g = new THREE.PlaneGeometry(1, 1);
    const data = new Float32Array(count * 4);
    g.setAttribute("aData", new THREE.InstancedBufferAttribute(data, 4).setUsage(THREE.DynamicDrawUsage));
    const pad = Math.round((mobile ? 0.6 : 1) * PAD_CLOUD);
    const trail = count - pad - VENT;
    const seed = new Float32Array(count * 6);
    for (let i = 0; i < count; i++) for (let k = 0; k < 6; k++) seed[i * 6 + k] = Math.random();
    return { g, data, count, pad, trail, seed };
  }, [mobile]);

  // Aimed floodlights (the targets must live in the scene for their matrices to update).
  const spots = useMemo(
    () =>
      FLOODS.slice(0, 2).map(([x, y, z], i) => {
        const s = new THREE.SpotLight("#fff1d6", i ? 26 : 38, 34, 0.42, 0.65, 1.4);
        s.position.set(x, y, z);
        s.target.position.set(0, 4.0, 0);
        return s;
      }),
    [],
  );
  useEffect(() => spots.forEach((s) => (s.intensity = theme === "light" ? 0 : s.position.x > 0 ? 38 : 26)), [spots, theme]);

  const vehicle = useRef<THREE.Group>(null);
  const boosters = useRef<(THREE.Group | null)[]>([]);
  const plumeCore = useRef<THREE.Mesh>(null);
  const plumeSrb = useRef<(THREE.Mesh | null)[]>([]);
  const glowCore = useRef<THREE.Mesh>(null);
  const glowSrb = useRef<(THREE.Mesh | null)[]>([]);
  const crewArm = useRef<THREE.Group>(null);
  const umbilicals = useRef<(THREE.Group | null)[]>([]);
  const smokeMesh = useRef<THREE.InstancedMesh>(null);
  const engineLight = useRef<THREE.PointLight>(null);
  const padLight = useRef<THREE.PointLight>(null);
  const beacons = useRef<THREE.Group>(null);

  const tmp = useMemo(
    () => ({
      m: new THREE.Matrix4(), q: new THREE.Quaternion(), s: new THREE.Vector3(), v: new THREE.Vector3(), w: new THREE.Vector3(),
      target: new THREE.Vector3(), look: new THREE.Vector3(), camPos: new THREE.Vector3(), nozzle: new THREE.Vector3(), up: new THREE.Vector3(0, 1, 0),
      fov: 30, init: false,
    }),
    [],
  );

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const p = pinProgress(stage.current?.parentElement ?? null);
    mat.sky.uniforms.uTime.value = reduce ? 0 : t;
    mat.sky.uniforms.uPx.value = THREE.MathUtils.degToRad(camera.fov) / Math.max(1, window.innerHeight);
    const f = flight(p);
    const portrait = camera.aspect < 0.85;

    // Crew access arm swings clear early; core-stage umbilicals retract at booster ignition.
    if (crewArm.current) crewArm.current.rotation.y = -1.25 * smootherstep((p - 0.06) / 0.06);
    const retract = smootherstep((p - 0.19) / 0.012);
    umbilicals.current.forEach((u) => u && (u.rotation.x = -1.1 * retract));

    // ---- vehicle ----
    const v = vehicle.current;
    if (v) {
      v.position.set(f.downrange, ML_H + f.h, 0);
      v.rotation.z = -f.pitch;
    }
    // Booster separation: thrusters push the spent boosters out, they fall behind and tumble.
    const sep = Math.max(0, p - P_SEP);
    boosters.current.forEach((b, i) => {
      if (!b) return;
      const side = i === 0 ? -1 : 1;
      b.position.set(side * (SRB_X + 50 * sep), SRB_C - 120 * Math.pow(sep, 1.4), -220 * sep);
      b.rotation.z = -side * 5 * sep;
      b.rotation.x = -3 * sep;
      b.visible = sep < 0.06;
    });

    // ---- engines ----
    const flick = reduce ? 1 : 0.92 + 0.08 * Math.sin(t * 43) * Math.sin(t * 17.3);
    const alt = smootherstep((p - 0.55) / 0.4); // thinner air: plume widens
    const tm = THREE.MathUtils;
    const cu = mat.plumeCore.uniforms;
    cu.uPower.value = f.core * (1.7 + alt * 0.8) * flick;
    cu.uSpread.value = 0.35 + alt * 3.6;
    cu.uTime.value = t;
    const su = mat.plumeSrb.uniforms;
    su.uPower.value = f.srb * 1.6 * flick;
    su.uSpread.value = 1.1 + alt * 2.2;
    su.uTime.value = t;
    mat.glowCore.uniforms.uPower.value = f.core * 1.0 * flick;
    mat.glowSrb.uniforms.uPower.value = f.srb * 1.25 * flick;
    if (plumeCore.current) plumeCore.current.scale.set(1 + alt * 1.2, tm.lerp(0.25, 1, f.core) * (1 + alt * 1.4), 1);
    plumeSrb.current.forEach((m) => m && m.scale.set(1, 1 + alt * 0.8, 1));
    if (engineLight.current) engineLight.current.intensity = (f.core * 6 + f.srb * 28) * flick;
    if (padLight.current) padLight.current.intensity = (f.core * 4 + f.srb * 20) * flick * (1 - smootherstep(f.h / 14));

    // Billboard plumes and glows toward the camera (rotate about the vehicle's long axis).
    const faceCam = (o: THREE.Object3D | null, full = false) => {
      if (!o) return;
      if (full) {
        o.quaternion.copy(camera.quaternion);
        if (o.parent) o.quaternion.premultiply(tmp.q.copy(o.parent.getWorldQuaternion(tmp.q)).invert());
        return;
      }
      o.getWorldPosition(tmp.v);
      tmp.w.copy(camera.position);
      o.parent?.worldToLocal(tmp.w);
      o.parent?.worldToLocal(tmp.v);
      o.rotation.y = Math.atan2(tmp.w.x - o.position.x, tmp.w.z - o.position.z);
    };
    faceCam(plumeCore.current);
    plumeSrb.current.forEach((m) => faceCam(m));
    faceCam(glowCore.current, true);
    glowSrb.current.forEach((m) => faceCam(m, true));

    mat.beam.uniforms.uPower.value = theme === "light" ? 0 : 0.07 * (1 - 0.6 * smootherstep(f.h / 30));

    // Beacons blink.
    if (beacons.current) beacons.current.visible = Math.floor(t * 1.2) % 2 === 0;

    // ---- smoke (deterministic in p) ----
    const sm = smokeMesh.current;
    if (sm) {
      const { data, seed, pad, trail } = smoke;
      let i = 0;
      const put = (x: number, y: number, z: number, scale: number, alpha: number, warm: number, rot: number) => {
        tmp.v.set(x, y, z);
        tmp.s.setScalar(alpha > 0.002 ? scale : 0);
        tmp.m.compose(tmp.v, tmp.q.identity(), tmp.s);
        sm.setMatrixAt(i, tmp.m);
        data[i * 4] = alpha;
        data[i * 4 + 1] = warm;
        data[i * 4 + 2] = rot;
        data[i * 4 + 3] = 0;
        i++;
      };
      const engineGlow = Math.min(1, f.core * 0.4 + f.srb);
      const wob = reduce ? 0 : 1;
      // (a) Ground cloud: steam and exhaust out of both ends of the flame trench, then a ring around the pad at liftoff.
      for (let k = 0; k < pad; k++) {
        const s0 = seed[i * 6], s1 = seed[i * 6 + 1], s2 = seed[i * 6 + 2], s3 = seed[i * 6 + 3], s4 = seed[i * 6 + 4];
        const pb = P_IGN + 0.01 + s0 * 0.34;
        const age = (p - pb) * SECONDS_PER_P;
        if (age <= 0) {
          put(0, 0, 0, 0, 0, 0, 0);
          continue;
        }
        const ring = s4 < 0.3 && pb > P_SRB;
        const side = s1 < 0.5 ? -1 : 1;
        const ang = s1 * Math.PI * 2;
        const v0 = 3 + s2 * 4;
        const dist = v0 * 2.2 * (1 - Math.exp(-age / 2.2));
        const x = ring ? Math.cos(ang) * (1.6 + dist * 0.8) : side * (2.2 + dist);
        const z = ring ? Math.sin(ang) * (1.6 + dist * 0.8) : -0.4 + (s3 - 0.5) * (1.4 + dist * 0.5);
        const y = 0.3 + age * (0.18 + s3 * 0.25) + 0.012 * age * age + Math.sin(t * 0.3 + s0 * 9) * 0.08 * wob;
        const scale = Math.min(9, 0.9 + age * (0.55 + s2 * 0.35));
        const alpha = 0.62 * smootherstep(age / 0.6) * Math.exp(-age / 22);
        const warm = engineGlow * Math.exp(-age * 0.35) * (1 - smootherstep(f.h / 25));
        put(x, y, z, scale, alpha, warm, s4 * 6.28 + age * 0.05);
      }
      // (b) Exhaust trail: emitted at the nozzles as the vehicle climbs, left hanging in the air.
      for (let k = 0; k < trail; k++) {
        const s0 = seed[i * 6], s1 = seed[i * 6 + 1], s2 = seed[i * 6 + 2], s3 = seed[i * 6 + 3];
        const pb = P_LIFT + Math.pow(s0, 1.25) * (0.97 - P_LIFT);
        const age = (p - pb) * SECONDS_PER_P;
        if (age <= 0) {
          put(0, 0, 0, 0, 0, 0, 0);
          continue;
        }
        const fb = flight(pb);
        const heavy = pb < P_SEP ? 1 : 0.3; // the solids smoke; the hydrogen core barely does
        tmp.nozzle.set(0, ML_H - 0.2, 0).applyAxisAngle(Z_AXIS, -fb.pitch);
        const spread = 0.25 + age * (0.12 + s2 * 0.1);
        const ang = s1 * Math.PI * 2;
        const x = fb.downrange + tmp.nozzle.x + Math.cos(ang) * spread;
        const z = Math.sin(ang) * spread;
        const y = Math.max(0.4, fb.h + tmp.nozzle.y - 0.6 - s3 * 1.2 - age * 0.25);
        const scale = (0.8 + age * (0.3 + s2 * 0.2)) * (1 + Math.min(fb.h, 160) / 70);
        const alpha = 0.5 * heavy * smootherstep(age / 0.5) * Math.exp(-age / 30);
        const warm = Math.exp(-age * 1.6) * (pb < P_SEP ? 1 : 0.4);
        put(x, y, z, scale, alpha, warm, s3 * 6.28);
      }
      // (c) Cryogenic venting before ignition: wisps sliding off the cold tanks.
      const vent = 1 - smootherstep((p - 0.06) / 0.08);
      for (let k = 0; k < VENT; k++) {
        const s0 = seed[i * 6], s1 = seed[i * 6 + 1], s2 = seed[i * 6 + 2];
        const life = ((reduce ? 0.5 : t * 0.22) + s0) % 1;
        const side = s1 < 0.5 ? -1 : 1;
        const x = side * (0.36 + life * (0.4 + s2 * 0.5));
        const y = ML_H + 1.2 + s2 * 4.2 - life * 1.6;
        put(x, y, (s1 - 0.5) * 0.4, 0.35 + life * 0.9, 0.35 * vent * Math.sin(life * Math.PI), 0, s0 * 6.28);
      }
      sm.count = i;
      sm.instanceMatrix.needsUpdate = true;
      smoke.g.attributes.aData.needsUpdate = true;
    }

    // ---- camera: ground tracking camera with a long lens ----
    const shake = reduce ? 0 : (f.core * 0.012 + f.srb * 0.045) * (1 - smootherstep(f.h / 40));
    tmp.camPos.set(portrait ? 7.5 : 10.5, 1.5, portrait ? 19 : 16.5);
    tmp.target.set(f.downrange, f.h, 0);
    // On the pad: frame the whole vehicle and tower; in flight: centre on the vehicle and its plume.
    // Hold the pad shot while the stack clears the mount, then tilt up and track it.
    const onPad = 1 - smootherstep((f.h - 1) / 10);
    const track = smootherstep((f.h - 1.5) / 9);
    tmp.look.set(f.downrange + (portrait ? 0 : -1.4) * onPad, THREE.MathUtils.lerp(4.6, ML_H + f.h + 3.4, track), 0);
    tmp.look.x += (Math.sin(t * 31) * 0.6 + Math.sin(t * 17)) * shake;
    tmp.look.y += Math.sin(t * 27) * shake;
    const dist = tmp.camPos.distanceTo(tmp.look);
    const keep = portrait ? 21 : 14.5; // visible height to hold around the vehicle
    const want = THREE.MathUtils.radToDeg(2 * Math.atan(keep / 2 / dist));
    const fov = THREE.MathUtils.clamp(want, 1.6, portrait ? 58 : 44);
    if (!tmp.init) {
      tmp.fov = fov;
      tmp.init = true;
    }
    tmp.fov = fov;
    camera.position.copy(tmp.camPos);
    camera.lookAt(tmp.look);
    if (Math.abs(camera.fov - tmp.fov) > 1e-3) {
      camera.fov = tmp.fov;
      camera.updateProjectionMatrix();
    }
    // Desktop: the headline sits on the left, so the pad composes right of centre.
    const a = camera.aspect;
    if (a >= 0.85) camera.setViewOffset(1000 * a, 1000, -0.14 * 1000 * a * onPad, 0, 1000 * a, 1000);
    // Phones: the headline block takes the lower half, so the pad composes high (eases back once airborne).
    else camera.setViewOffset(1000 * a, 1000, 0, (0.12 + 0.12 * onPad) * 1000, 1000 * a, 1000);
  });

  return (
    <>
      <PerspectiveCamera makeDefault fov={30} near={0.5} far={4000} position={[10.5, 1.5, 16.5]} />
      <fog attach="fog" args={[theme === "light" ? "#cfdbe6" : "#1a2029", 40, 900]} />
      <hemisphereLight args={[theme === "light" ? "#dfe9f5" : "#2c3a55", theme === "light" ? "#6b6a60" : "#0b0c0e", theme === "light" ? 1.2 : 0.6]} />
      {/* Key light: the Moon at night (rim-lights the vehicle), the sun by day. */}
      <directionalLight position={theme === "light" ? [10, 14, 12] : [5, 36, -93]} intensity={theme === "light" ? 2.2 : 1.6} color={theme === "light" ? "#fff6e8" : "#c3d1ec"} />
      <directionalLight position={[10, 6, 14]} intensity={theme === "light" ? 0 : 0.35} color="#8fa3c8" />
      <Environment key={theme} resolution={256} frames={1} environmentIntensity={theme === "light" ? 0.9 : 0.55}>
        <mesh scale={100}>
          <sphereGeometry args={[1, 32, 16]} />
          <meshBasicMaterial side={THREE.BackSide} color={theme === "light" ? "#9fbcd9" : "#070b12"} />
        </mesh>
        <Lightformer form="rect" intensity={theme === "light" ? 0 : 9} color="#fff1d6" position={[4.5, 3.3, 5.1]} scale={[3.5, 2, 1]} target={[0, 4, 0]} />
        <Lightformer form="rect" intensity={theme === "light" ? 0 : 7} color="#fff1d6" position={[-4.5, 3.3, 5.1]} scale={[3.5, 2, 1]} target={[0, 4, 0]} />
        {/* Soft fill from the camera side, so the curved steel always catches a highlight */}
        <Lightformer form="rect" intensity={theme === "light" ? 0.6 : 1.4} color="#cfd9ec" position={[12, 4, 18]} scale={[14, 6, 1]} target={[0, 4, 0]} />
        <Lightformer form="circle" intensity={theme === "light" ? 0 : 3} color="#dfe6f5" position={[3, 22, -55]} scale={5} target={[0, 4, 0]} />
        <Lightformer form="rect" intensity={theme === "light" ? 2.5 : 0.25} color="#ffffff" position={[0, 40, 0]} scale={[60, 60, 1]} target={[0, 0, 0]} />
      </Environment>
      {/* Pad floodlights: aimed lamps on the poles, plus the beams they draw in the night air */}
      {spots.map((sp, i) => (
        <group key={i}>
          <primitive object={sp} />
          <primitive object={sp.target} />
        </group>
      ))}
      <mesh geometry={geo.beams} material={mat.beam} renderOrder={7} />
      <pointLight ref={padLight} position={[0, 0.6, 1.2]} distance={26} decay={1.6} color="#ffa255" intensity={0} />

      {/* Sky and ground */}
      <mesh material={mat.sky}>
        <sphereGeometry args={[2000, 32, 16]} />
      </mesh>
      <mesh geometry={geo.hills} material={mat.hills} />
      <points geometry={geo.lights} material={mat.siteLights} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} material={mat.ground}>
        <planeGeometry args={[3000, 3000]} />
      </mesh>
      <mesh position={[0, -0.15, 0]} material={mat.deck}>
        <boxGeometry args={[11, 0.3, 9]} />
      </mesh>

      {/* Mobile Launcher: base, umbilical tower, crew access arm, core-stage umbilicals */}
      <mesh geometry={geo.mlBase} material={mat.mlGrey} />
      <mesh position={[0, ML_H + 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]} material={mat.trench}>
        <planeGeometry args={[1.7, 0.9]} />
      </mesh>
      <mesh geometry={geo.mlTower} material={mat.mlGrey} />
      <group ref={crewArm} position={[-0.3, ORION_Y, ML_TOWER_Z + ML_TOWER_W / 2]}>
        <mesh material={mat.mlGrey} position={[0.3, 0, 0.32]}>
          <boxGeometry args={[0.12, 0.1, 0.64]} />
        </mesh>
        <mesh material={mat.white} position={[0.3, 0, 0.66]}>
          <boxGeometry args={[0.2, 0.16, 0.12]} />
        </mesh>
      </group>
      {[ML_H + 2.2, ML_H + 4.6].map((y, i) => (
        <group key={y} ref={(el) => void (umbilicals.current[i] = el)} position={[0.12, y, ML_TOWER_Z + ML_TOWER_W / 2]}>
          <mesh material={mat.mlGrey} position={[0, 0, 0.21]}>
            <boxGeometry args={[0.08, 0.08, 0.42]} />
          </mesh>
        </group>
      ))}
      <mesh geometry={geo.mast} material={mat.steel} />
      <mesh geometry={geo.pole} material={mat.steel} />
      <group ref={beacons}>
        {[[-7, 13, -6], [7, 13, -6], [-6, 13, -13], [6, 13, -13], TOWER_TOP].map(([x, y, z], i) => (
          <mesh key={i} position={[x, y, z]} material={mat.redLight}>
            <sphereGeometry args={[0.09, 8, 6]} />
          </mesh>
        ))}
      </group>
      {FLOODS.map(([x, y, z], i) => (
        <mesh key={i} position={[x, y, z]} material={mat.flood}>
          <boxGeometry args={[0.44, 0.24, 0.02]} />
        </mesh>
      ))}

      {/* Launch vehicle: core stage and upper stack, plus the two boosters (separate model nodes) */}
      <group ref={vehicle} position={[0, ML_H, 0]}>
        <Suspense fallback={null}>
          <VehiclePart names={CORE} />
          {/* Easter egg: a small Team Phoenix mark on the core stage, low down, facing the tracking camera */}
          <PhoenixDecal width={0.17} radius={0.336} angle={0.57} position={[0, (-4250 - BASE) * S, 0]} brightness={0.8} />
        </Suspense>
        <pointLight ref={engineLight} position={[0, -0.6, 0]} distance={40} decay={1.4} color="#ffb26b" intensity={0} />
        <mesh ref={plumeCore} geometry={geo.plumeCore} material={mat.plumeCore} position={[0, RS25_Y, 0]} renderOrder={5} />
        <mesh ref={glowCore} geometry={geo.glow} material={mat.glowCore} position={[0, RS25_Y - 0.1, 0]} scale={2.2} renderOrder={6} />
        {[-1, 1].map((side, i) => (
          <group key={side} ref={(el) => void (boosters.current[i] = el)} position={[side * SRB_X, SRB_C, 0]}>
            <Suspense fallback={null}>
              <VehiclePart names={side < 0 ? SRB_LEFT : SRB_RIGHT} offset={[-side * SRB_X, -SRB_C, 0]} />
            </Suspense>
            <mesh ref={(el) => void (plumeSrb.current[i] = el)} geometry={geo.plumeSrb} material={mat.plumeSrb} position={[0, -SRB_C, 0]} renderOrder={5} />
            <mesh ref={(el) => void (glowSrb.current[i] = el)} geometry={geo.glow} material={mat.glowSrb} position={[0, -SRB_C - 0.1, 0]} scale={2.6} renderOrder={6} />
          </group>
        ))}
      </group>

      <instancedMesh ref={smokeMesh} args={[smoke.g, mat.smoke, smoke.count]} frustumCulled={false} renderOrder={4} />
    </>
  );
}
