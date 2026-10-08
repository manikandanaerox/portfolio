"use client";

import { Suspense, useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Environment, PerspectiveCamera, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { chapters } from "../../content";
import { useTheme } from "../../lib/theme";
import { blendAt, reducedMotion } from "../../lib/stage";
import { composeView, dampV, isPortrait, stepOf, type ActProps } from "./common";
import { PLUME_FRAG, PLUME_VERT, plumeUniforms } from "./shaders";

/*
  Propulsion chapter: a full-flow staged-combustion engine (public/models/raptor.glb,
  optimised from raptor.fbx) shown as a studio piece. The model ships with a single
  untextured material, so parts get PBR materials by name: brushed steel body and
  turbomachinery, polished plumbing, dark brackets, a heat-tinted chamber and bell.
  Scrolling turns it on a turntable while the camera moves between the step keys;
  on the supersonic step it hot-fires with a shock-diamond plume.
*/

const N = chapters.rocket.steps.length;
const MODEL_URL = "/models/raptor.glb";
useGLTF.preload(MODEL_URL, false, true);

// Model space: y up, nozzle exit at y = -100, thrust plate at ~655.
const S = 3 / 755;
const CENTRE_Y = 277;
const EXIT_Y = (-100 - CENTRE_Y) * S;

// Camera keys per step: [position, target]. Engine centred on the origin.
const KEYS: [THREE.Vector3, THREE.Vector3][] = [
  [new THREE.Vector3(3.6, 1.1, 6.6), new THREE.Vector3(0, 0, 0)],
  [new THREE.Vector3(2.5, 1.5, 4.2), new THREE.Vector3(0, 0.45, 0)],
  [new THREE.Vector3(-3.1, 0.9, 3.9), new THREE.Vector3(0, 0.25, 0)],
  [new THREE.Vector3(3.0, -1.4, 4.6), new THREE.Vector3(0, -1.2, 0)],
  [new THREE.Vector3(5.2, 0.6, 8.6), new THREE.Vector3(0, -0.4, 0)],
];
// Hot-fire amount per step.
const FIRE = [0, 0, 0, 1, 0.55];

function Raptor({ heat }: { heat: React.RefObject<number> }) {
  const { scene } = useGLTF(MODEL_URL, false, true);
  const mats = useMemo(
    () => ({
      body: new THREE.MeshStandardMaterial({ color: "#b4b8be", metalness: 1, roughness: 0.3 }),
      bell: new THREE.MeshStandardMaterial({ color: "#9e9792", metalness: 1, roughness: 0.26, emissive: new THREE.Color("#ff5a1a"), emissiveIntensity: 0 }),
      pipe: new THREE.MeshStandardMaterial({ color: "#d3d6db", metalness: 1, roughness: 0.18 }),
      copper: new THREE.MeshStandardMaterial({ color: "#b8733d", metalness: 1, roughness: 0.3 }),
      dark: new THREE.MeshStandardMaterial({ color: "#34373c", metalness: 0.75, roughness: 0.45 }),
      plate: new THREE.MeshStandardMaterial({ color: "#878c93", metalness: 0.9, roughness: 0.38 }),
    }),
    [],
  );
  const object = useMemo(() => {
    const root = scene.clone(true);
    let k = 0;
    root.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      const n = m.name;
      if (n === "Cylinder001") m.material = mats.bell; // combustion chamber and bell
      else if (n.startsWith("BezierCurve")) m.material = k++ % 6 === 0 ? mats.copper : mats.pipe; // plumbing
      else if (n.startsWith("Cube")) m.material = mats.dark; // brackets, actuators
      else if (n.startsWith("Plane")) m.material = mats.plate;
      else m.material = mats.body; // turbopumps, manifolds, valves
    });
    return root;
  }, [scene, mats]);
  useEffect(() => () => Object.values(mats).forEach((m) => m.dispose()), [mats]);
  useFrame(() => {
    // A faint heat glow only: the chamber and bell are one mesh, so keep it subtle.
    mats.bell.emissiveIntensity = (heat.current ?? 0) * 0.12;
  });
  return (
    <group scale={S} position={[0, -CENTRE_Y * S, 0]}>
      <primitive object={object} />
    </group>
  );
}

export function RocketEngineAct({ stage }: ActProps) {
  const theme = useTheme();
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const reduce = useMemo(() => reducedMotion(), []);

  const plumeMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: PLUME_VERT,
        fragmentShader: PLUME_FRAG,
        uniforms: plumeUniforms("#ff7a2a", "#fff3dc", { cell: 0.13, diamond: 1.0, spread: 0.5, decay: 2.0 }),
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
      }),
    [],
  );
  const plumeGeo = useMemo(() => new THREE.PlaneGeometry(4.2, 1.15).translate(2.1, 0, 0).rotateZ(-Math.PI / 2), []);
  useEffect(() => () => (plumeMat.dispose(), plumeGeo.dispose()), [plumeMat, plumeGeo]);
  useEffect(() => {
    const dark = theme !== "light";
    plumeMat.blending = dark ? THREE.AdditiveBlending : THREE.NormalBlending;
    plumeMat.premultipliedAlpha = !dark;
    (plumeMat.uniforms.uCore.value as THREE.Color).set(dark ? "#fff3dc" : "#d2652a");
    plumeMat.needsUpdate = true;
  }, [theme, plumeMat]);

  const turntable = useRef<THREE.Group>(null);
  const plume = useRef<THREE.Mesh>(null);
  const glow = useRef<THREE.PointLight>(null);
  const heat = useRef(0);
  const rig = useMemo(() => ({ pos: KEYS[0][0].clone(), tgt: KEYS[0][1].clone(), wp: new THREE.Vector3(), wt: new THREE.Vector3(), init: false, spin: 0 }), []);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const t = state.clock.elapsedTime;
    const s = stepOf(stage, N);
    const { a, b, t: k } = blendAt(s, N);

    rig.wp.lerpVectors(KEYS[a][0], KEYS[b][0], k);
    rig.wt.lerpVectors(KEYS[a][1], KEYS[b][1], k);
    if (isPortrait(camera)) rig.wp.sub(rig.wt).multiplyScalar(1.9).add(rig.wt);
    if (!rig.init) {
      rig.pos.copy(rig.wp);
      rig.tgt.copy(rig.wt);
      rig.init = true;
    }
    dampV(rig.pos, rig.wp, 3, dt);
    dampV(rig.tgt, rig.wt, 3, dt);
    camera.position.copy(rig.pos);
    camera.lookAt(rig.tgt);
    composeView(camera, 0.2, 0.27);

    // Turntable: scroll turns the engine; a slow idle drift keeps it alive.
    rig.spin = THREE.MathUtils.damp(rig.spin, s * 1.1 + (reduce ? 0 : t * 0.06), 3, dt);
    if (turntable.current) turntable.current.rotation.y = -0.6 + rig.spin;

    heat.current = THREE.MathUtils.damp(heat.current, THREE.MathUtils.lerp(FIRE[a], FIRE[b], k), 3, dt);
    const flick = reduce ? 1 : 0.93 + 0.07 * Math.sin(t * 41) * Math.sin(t * 13.7);
    plumeMat.uniforms.uTime.value = t;
    plumeMat.uniforms.uPower.value = heat.current * 1.6 * flick;
    if (plume.current) {
      plume.current.visible = heat.current > 0.01;
      plume.current.scale.set(1, 0.35 + 0.65 * heat.current, 1);
      plume.current.rotation.y = Math.atan2(camera.position.x, camera.position.z);
    }
    if (glow.current) glow.current.intensity = heat.current * 14 * flick;
  });

  return (
    <>
      <PerspectiveCamera makeDefault fov={30} near={0.1} far={80} position={KEYS[0][0].toArray()} />
      <Environment files="/hdri/studio_small_09_1k.hdr" environmentIntensity={0.9} />
      <ambientLight intensity={0.15} />
      {/* Studio: a warm key, a cool rim from behind, a low fill */}
      <directionalLight position={[4, 5, 4]} intensity={1.8} color="#fff1e0" />
      <directionalLight position={[-5, 3, -5]} intensity={1.6} color="#a9c4ff" />
      <directionalLight position={[0, -4, 3]} intensity={0.35} color="#ffd2a8" />
      <pointLight ref={glow} position={[0, EXIT_Y - 0.4, 0]} distance={8} decay={1.5} color="#ff9a4a" intensity={0} />

      <group ref={turntable}>
        <Suspense fallback={null}>
          <Raptor heat={heat} />
        </Suspense>
      </group>
      <mesh ref={plume} geometry={plumeGeo} material={plumeMat} position={[0, EXIT_Y, 0]} renderOrder={3} visible={false} />
    </>
  );
}
