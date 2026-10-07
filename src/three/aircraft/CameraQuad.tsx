"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import { type AircraftState, LED, beam, bladeGeometry, disposeAll, extrudeSmoothPlan, propMaterials, strobeOn, updatePropVisuals } from "../kit";
import { Motor, Rotor } from "../parts";

/*
  Folding consumer camera drone (Mavic class). Front faces +Z.
  Pebble-shaped shell, front arms swing out level, rear arms mount low and
  angle down so the rear props sit below the front ones. Three-axis gimbal
  hangs under the nose with a main and a tele lens.
*/

const S = 2; // built at ~0.6 m scale, displayed larger
const FRONT = { x: 0.33, y: 0.05, z: 0.25 };
const REAR = { x: 0.3, y: -0.015, z: -0.29 };
const PROP_R = 0.24;
const MOTORS: { p: [number, number, number]; dir: 1 | -1; front: boolean; side: number }[] = [
  { p: [FRONT.x, FRONT.y, FRONT.z], dir: 1, front: true, side: 1 },
  { p: [-FRONT.x, FRONT.y, FRONT.z], dir: -1, front: true, side: -1 },
  { p: [REAR.x, REAR.y, REAR.z], dir: -1, front: false, side: 1 },
  { p: [-REAR.x, REAR.y, REAR.z], dir: 1, front: false, side: -1 },
];

const BODY_PLAN: [number, number][] = [
  [0, 0.33], [0.07, 0.3], [0.11, 0.17], [0.122, 0], [0.112, -0.2], [0.075, -0.3], [0, -0.325],
  [-0.075, -0.3], [-0.112, -0.2], [-0.122, 0], [-0.11, 0.17], [-0.07, 0.3],
];
const BATT_PLAN: [number, number][] = [
  [0.08, 0.06], [0.09, -0.12], [0.07, -0.26], [0, -0.29], [-0.07, -0.26], [-0.09, -0.12], [-0.08, 0.06], [0, 0.08],
];

export function CameraQuad({ state }: { state: React.RefObject<AircraftState> }) {
  const a = useMemo(() => {
    const props = propMaterials("#2a2d31", "#a3a8ad");
    const mat = {
      shell: new THREE.MeshStandardMaterial({ color: "#33363b", roughness: 0.62, metalness: 0.04 }),
      battery: new THREE.MeshStandardMaterial({ color: "#26282c", roughness: 0.66, metalness: 0.04 }),
      arm: new THREE.MeshStandardMaterial({ color: "#2f3236", roughness: 0.6, metalness: 0.04 }),
      dark: new THREE.MeshStandardMaterial({ color: "#1a1b1e", roughness: 0.6, metalness: 0.1 }),
      bell: new THREE.MeshStandardMaterial({ color: "#2b2d31", roughness: 0.35, metalness: 0.7 }),
      ring: new THREE.MeshStandardMaterial({ color: "#a9adb2", roughness: 0.3, metalness: 0.9 }),
      copper: new THREE.MeshStandardMaterial({ color: "#8a5a3c", roughness: 0.35, metalness: 0.85 }),
      glass: new THREE.MeshStandardMaterial({ color: "#06080b", roughness: 0.03, metalness: 0.5 }),
      lensRing: new THREE.MeshStandardMaterial({ color: "#121316", roughness: 0.3, metalness: 0.6 }),
      tip: new THREE.MeshStandardMaterial({ color: "#c8cbce", roughness: 0.4, metalness: 0.2, transparent: true }),
      red: LED.red(),
      green: LED.green(),
      white: LED.white(),
      ...props,
    };
    const geo = {
      body: extrudeSmoothPlan(BODY_PLAN, 0.13, 0.045),
      battery: extrudeSmoothPlan(BATT_PLAN, 0.03, 0.012),
      grip: new THREE.BoxGeometry(0.15, 0.006, 0.008),
      eye: new THREE.CylinderGeometry(0.013, 0.013, 0.01, 20).rotateX(Math.PI / 2),
      eyeDown: new THREE.CylinderGeometry(0.014, 0.014, 0.01, 20),
      frontArms: [1, -1].map((sx) => beam([sx * 0.09, 0.035, 0.15], [sx * FRONT.x, FRONT.y - 0.005, FRONT.z], 0.04, 0.026, 0.8)),
      rearArms: [1, -1].map((sx) => beam([sx * 0.07, -0.045, -0.17], [sx * REAR.x, REAR.y - 0.02, REAR.z], 0.038, 0.024, 0.8)),
      hinge: new THREE.CylinderGeometry(0.02, 0.02, 0.05, 20),
      leg: beam([0, -0.01, 0], [0, -0.075, 0.012], 0.014, 0.01, 0.7),
      led: new THREE.SphereGeometry(0.009, 10, 10),
      blade: bladeGeometry({ R: PROP_R, root: 0.025, chord: 0.045, tipChord: 0.016, droop: 0.004 }),
      gYaw: new THREE.CylinderGeometry(0.022, 0.022, 0.02, 24),
      gArm: new THREE.BoxGeometry(0.012, 0.05, 0.028),
      gRollMotor: new THREE.CylinderGeometry(0.02, 0.02, 0.016, 20).rotateZ(Math.PI / 2),
      lens: new THREE.CylinderGeometry(0.023, 0.025, 0.02, 32).rotateX(Math.PI / 2),
      lensGlass: new THREE.CylinderGeometry(0.019, 0.019, 0.004, 32).rotateX(Math.PI / 2),
      tele: new THREE.CylinderGeometry(0.011, 0.011, 0.012, 20).rotateX(Math.PI / 2),
    };
    return { mat, geo };
  }, []);
  useEffect(() => () => disposeAll(a), [a]);
  const { mat, geo } = a;

  const rotors = useRef<THREE.Group[]>([]);
  const gimbal = useRef<THREE.Group>(null);
  const strobe = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    const st = state.current;
    if (!st) return;
    const dt = Math.min(delta, 0.05);
    rotors.current.forEach((r, i) => r && (r.rotation.y += MOTORS[i].dir * st.lift * 60 * dt));
    updatePropVisuals(st.lift, mat);
    mat.tip.opacity = mat.prop.opacity;
    if (gimbal.current) gimbal.current.rotation.x = THREE.MathUtils.damp(gimbal.current.rotation.x, st.gimbalPitch, 10, dt);
    if (strobe.current) strobe.current.visible = strobeOn(st.t, 1.6);
  });

  return (
    <group scale={S}>
      {/* shell */}
      <mesh geometry={geo.body} material={mat.shell} />
      <mesh geometry={geo.battery} material={mat.battery} position={[0, 0.072, 0]} />
      {[-0.06, -0.09, -0.12, -0.15].map((z) => (
        <mesh key={z} geometry={geo.grip} material={mat.dark} position={[0, 0.088, z]} />
      ))}
      {/* vision sensors: front pair, rear pair, belly pair */}
      {[0.035, -0.035].map((x) => (
        <mesh key={`f${x}`} geometry={geo.eye} material={mat.glass} position={[x, 0.035, 0.318]} />
      ))}
      {[0.03, -0.03].map((x) => (
        <mesh key={`r${x}`} geometry={geo.eye} material={mat.glass} position={[x, 0.02, -0.318]} rotation={[0, Math.PI, 0]} />
      ))}
      {[0.06, -0.08].map((z) => (
        <mesh key={`d${z}`} geometry={geo.eyeDown} material={mat.glass} position={[0, -0.066, z]} />
      ))}
      <mesh ref={strobe} geometry={geo.led} material={mat.white} position={[0, -0.066, -0.2]} />

      {/* arms with hinge barrels */}
      {geo.frontArms.map((g, i) => (
        <mesh key={`fa${i}`} geometry={g} material={mat.arm} />
      ))}
      {geo.rearArms.map((g, i) => (
        <mesh key={`ra${i}`} geometry={g} material={mat.arm} />
      ))}
      {[1, -1].map((sx) => (
        <group key={sx}>
          <mesh geometry={geo.hinge} material={mat.dark} position={[sx * 0.1, 0.035, 0.15]} />
          <mesh geometry={geo.hinge} material={mat.dark} position={[sx * 0.08, -0.045, -0.17]} />
        </group>
      ))}

      {/* motors, props, front landing legs, arm lights */}
      {MOTORS.map((m, i) => (
        <group key={i} position={m.p}>
          <Motor r={0.034} h={0.04} bell={mat.bell} stator={mat.copper} ring={mat.ring} base={mat.arm} />
          {m.front && <mesh geometry={geo.leg} material={mat.dark} />}
          <mesh geometry={geo.led} material={m.front ? (m.side > 0 ? mat.red : mat.green) : mat.dark} position={[0, -0.012, m.front ? 0.03 : -0.03]} />
          <group position={[0, 0.052, 0]}>
            <Rotor
              blade={geo.blade}
              radius={PROP_R}
              dir={m.dir}
              prop={mat.prop}
              disc={mat.disc}
              hub={mat.bell}
              tip={mat.tip}
              phase={i * 0.8}
              register={(g) => {
                if (g) rotors.current[i] = g;
              }}
            />
          </group>
        </group>
      ))}

      {/* 3-axis gimbal under the nose */}
      <group position={[0, -0.07, 0.25]}>
        <mesh geometry={geo.gYaw} material={mat.dark} />
        <mesh geometry={geo.gArm} material={mat.shell} position={[0.05, -0.03, 0]} />
        <mesh geometry={geo.gRollMotor} material={mat.dark} position={[0.045, -0.055, 0]} />
        <group ref={gimbal} position={[0, -0.055, 0.005]}>
          <RoundedBox args={[0.08, 0.058, 0.065]} radius={0.012} smoothness={3} material={mat.shell} />
          <mesh geometry={geo.lens} material={mat.lensRing} position={[-0.008, 0, 0.04]} />
          <mesh geometry={geo.lensGlass} material={mat.glass} position={[-0.008, 0, 0.051]} />
          <mesh geometry={geo.tele} material={mat.glass} position={[0.026, 0.012, 0.036]} />
        </group>
      </group>
    </group>
  );
}
