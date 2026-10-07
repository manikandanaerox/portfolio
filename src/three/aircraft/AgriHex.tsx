"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import {
  type AircraftState, LED, bladeGeometry, carbonTexture, disposeAll, extrudeSmoothPlan, hose, labelTexture, propMaterials, strobeOn, tube, updatePropVisuals,
} from "../kit";
import { Motor, Rotor } from "../parts";

/*
  Agricultural spray hexacopter (Agras class). Front faces +Z.
  Six folding carbon arms with large motors, a translucent spray tank with
  visible liquid, hoses running out to downward nozzles under four rotors,
  front and rear obstacle radars, headlights and tall splayed landing gear.
*/

const ARM_R = 1.12;
const PROP_R = 0.52;
// Arms at 30°, 90°, 150° ... so two arms point forward-left / forward-right.
const ARMS = [30, 90, 150, 210, 270, 330].map((d) => THREE.MathUtils.degToRad(d));
const DIRS: (1 | -1)[] = [1, -1, 1, -1, 1, -1];
const NOZZLE_ARMS = [0, 2, 3, 5]; // front and rear pairs carry nozzles
export const AGRI_GEAR_DROP = 0.66;

const BODY_PLAN: [number, number][] = [
  [0, 0.42], [0.2, 0.36], [0.3, 0.18], [0.32, -0.05], [0.26, -0.3], [0.12, -0.4], [0, -0.42],
  [-0.12, -0.4], [-0.26, -0.3], [-0.32, -0.05], [-0.3, 0.18], [-0.2, 0.36],
];

export function AgriHex({ state }: { state: React.RefObject<AircraftState> }) {
  const a = useMemo(() => {
    const carbon = carbonTexture(16);
    carbon.repeat.set(1, 8);
    const tankLabel = labelTexture(["20 L", "MAX"], "#e4e6e3", "#2a2c2e");
    const props = propMaterials("#1c1d20", "#9aa0a6");
    const mat = {
      shell: new THREE.MeshStandardMaterial({ color: "#d3d6d2", roughness: 0.42, metalness: 0.03 }),
      shellDark: new THREE.MeshStandardMaterial({ color: "#2a2d31", roughness: 0.6, metalness: 0.1 }),
      carbon: new THREE.MeshStandardMaterial({ map: carbon, roughness: 0.42, metalness: 0.15 }),
      joint: new THREE.MeshStandardMaterial({ color: "#2b2e32", roughness: 0.45, metalness: 0.3 }),
      latch: new THREE.MeshStandardMaterial({ color: "#ffb224", roughness: 0.55, metalness: 0.05 }),
      bell: new THREE.MeshStandardMaterial({ color: "#2f3236", roughness: 0.32, metalness: 0.8 }),
      ring: new THREE.MeshStandardMaterial({ color: "#b4b8bd", roughness: 0.25, metalness: 0.95 }),
      copper: new THREE.MeshStandardMaterial({ color: "#8a5a3c", roughness: 0.35, metalness: 0.85 }),
      tank: new THREE.MeshStandardMaterial({ color: "#eef0ee", roughness: 0.35, metalness: 0, transparent: true, opacity: 0.55, depthWrite: false }),
      liquid: new THREE.MeshStandardMaterial({ color: "#56807a", roughness: 0.2, metalness: 0.05, transparent: true, opacity: 0.85 }),
      label: new THREE.MeshStandardMaterial({ map: tankLabel, roughness: 0.6 }),
      hose: new THREE.MeshStandardMaterial({ color: "#1a1b1d", roughness: 0.7 }),
      nozzle: new THREE.MeshStandardMaterial({ color: "#3b3e43", roughness: 0.4, metalness: 0.5 }),
      radar: new THREE.MeshStandardMaterial({ color: "#1c1e21", roughness: 0.3, metalness: 0.2 }),
      gear: new THREE.MeshStandardMaterial({ color: "#35383d", roughness: 0.5, metalness: 0.3 }),
      rubber: new THREE.MeshStandardMaterial({ color: "#121314", roughness: 0.92 }),
      headlight: new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 2.35, 2.2), toneMapped: false }),
      red: LED.red(),
      green: LED.green(),
      white: LED.white(),
      ...props,
    };

    const arms = ARMS.map((ang) => {
      const ox = Math.sin(ang);
      const oz = Math.cos(ang);
      return tube([ox * 0.3, 0.12, oz * 0.3], [ox * (ARM_R - 0.08), 0.15, oz * (ARM_R - 0.08)], 0.036, 18);
    });
    const hoses = NOZZLE_ARMS.map((i) => {
      const ox = Math.sin(ARMS[i]);
      const oz = Math.cos(ARMS[i]);
      return hose(
        [
          [ox * 0.12, -0.04, oz * 0.12],
          [ox * 0.3, 0.06, oz * 0.3],
          [ox * 0.7, 0.085, oz * 0.7],
          [ox * (ARM_R - 0.02), 0.05, oz * (ARM_R - 0.02)],
          [ox * ARM_R, -0.06, oz * ARM_R],
        ],
        0.009,
      );
    });
    const legs = [1, -1].flatMap((sx) =>
      [1, -1].map((sz) => tube([sx * 0.2, 0.02, sz * 0.2], [sx * 0.46, -0.64, sz * 0.26], 0.026, 16)),
    );
    const braces = [1, -1].map((sx) => tube([sx * 0.38, -0.44, 0.24], [sx * 0.38, -0.44, -0.24], 0.016, 12));

    const geo = {
      body: extrudeSmoothPlan(BODY_PLAN, 0.16, 0.05),
      cover: extrudeSmoothPlan(BODY_PLAN.map(([x, z]) => [x * 0.72, z * 0.72] as [number, number]), 0.05, 0.02),
      vent: new THREE.BoxGeometry(0.2, 0.006, 0.014),
      arms,
      hoses,
      legs,
      braces,
      joint: new THREE.CylinderGeometry(0.055, 0.055, 0.1, 24),
      latchBand: new THREE.CylinderGeometry(0.044, 0.044, 0.03, 24),
      armEnd: new THREE.CylinderGeometry(0.075, 0.06, 0.07, 28),
      nozzle: new THREE.CylinderGeometry(0.022, 0.03, 0.07, 18),
      nozzleTip: new THREE.ConeGeometry(0.016, 0.03, 16).rotateX(Math.PI),
      skid: new THREE.CylinderGeometry(0.026, 0.026, 1.0, 16).rotateX(Math.PI / 2),
      skidCap: new THREE.CapsuleGeometry(0.03, 0.04, 6, 12).rotateX(Math.PI / 2),
      radarFace: new THREE.BoxGeometry(0.2, 0.09, 0.012),
      headlight: new THREE.BoxGeometry(0.05, 0.016, 0.006),
      tankLabel: new THREE.PlaneGeometry(0.16, 0.08),
      cap: new THREE.CylinderGeometry(0.05, 0.05, 0.03, 24),
      led: new THREE.SphereGeometry(0.016, 10, 10),
      blade: bladeGeometry({ R: PROP_R, root: 0.05, chord: 0.085, tipChord: 0.03, droop: 0.012 }),
    };
    return { mat, geo };
  }, []);
  useEffect(() => () => disposeAll(a), [a]);
  const { mat, geo } = a;

  const rotors = useRef<THREE.Group[]>([]);
  const strobes = useRef<THREE.Mesh[]>([]);

  useFrame((_, delta) => {
    const st = state.current;
    if (!st) return;
    const dt = Math.min(delta, 0.05);
    rotors.current.forEach((r, i) => r && (r.rotation.y += DIRS[i] * st.lift * 42 * dt));
    updatePropVisuals(st.lift, mat);
    const on = strobeOn(st.t, 1.5);
    strobes.current.forEach((m) => (m.visible = on));
  });

  return (
    <group>
      {/* body shell with dark top cover and vents */}
      <mesh geometry={geo.body} material={mat.shell} position={[0, 0.12, 0]} />
      <mesh geometry={geo.cover} material={mat.shellDark} position={[0, 0.215, -0.02]} />
      {[-0.08, -0.12, -0.16].map((z) => (
        <mesh key={z} geometry={geo.vent} material={mat.joint} position={[0, 0.242, z]} />
      ))}

      {/* front and rear radars, headlights */}
      <group position={[0, 0.07, 0.42]} rotation={[0.25, 0, 0]}>
        <RoundedBox args={[0.24, 0.12, 0.05]} radius={0.02} smoothness={3} material={mat.radar} />
        <mesh geometry={geo.radarFace} material={mat.shellDark} position={[0, 0, 0.026]} />
      </group>
      <group position={[0, 0.07, -0.42]} rotation={[0.25, Math.PI, 0]}>
        <RoundedBox args={[0.22, 0.11, 0.05]} radius={0.02} smoothness={3} material={mat.radar} />
      </group>
      {[0.16, -0.16].map((x) => (
        <mesh key={x} geometry={geo.headlight} material={mat.headlight} position={[x, 0.1, 0.395]} rotation={[0, x > 0 ? 0.5 : -0.5, 0]} />
      ))}

      {/* spray tank with liquid, cap and fill marking */}
      <group position={[0, -0.16, 0]}>
        <mesh position={[0, -0.05, 0]} material={mat.liquid}>
          <boxGeometry args={[0.44, 0.2, 0.4]} />
        </mesh>
        <RoundedBox args={[0.5, 0.36, 0.46]} radius={0.06} smoothness={4} material={mat.tank} renderOrder={3} />
        <mesh geometry={geo.tankLabel} material={mat.label} position={[0, 0.02, 0.232]} />
        <mesh geometry={geo.cap} material={mat.joint} position={[0, 0.19, -0.12]} />
      </group>

      {/* landing gear */}
      {geo.legs.map((g, i) => (
        <mesh key={i} geometry={g} material={mat.gear} />
      ))}
      {geo.braces.map((g, i) => (
        <mesh key={`b${i}`} geometry={g} material={mat.gear} />
      ))}
      {[0.46, -0.46].map((x) => (
        <group key={x} position={[x, -0.64, 0]}>
          <mesh geometry={geo.skid} material={mat.gear} />
          <mesh geometry={geo.skidCap} material={mat.rubber} position={[0, 0, 0.51]} />
          <mesh geometry={geo.skidCap} material={mat.rubber} position={[0, 0, -0.51]} />
        </group>
      ))}

      {/* hoses */}
      {geo.hoses.map((g, i) => (
        <mesh key={i} geometry={g} material={mat.hose} />
      ))}

      {/* arms, folding joints, motors, nozzles, props */}
      {ARMS.map((ang, i) => {
        const ox = Math.sin(ang);
        const oz = Math.cos(ang);
        const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(ox, 0, oz));
        const front = oz > 0.5;
        const rear = oz < -0.5;
        return (
          <group key={i}>
            <mesh geometry={geo.arms[i]} material={mat.carbon} />
            <mesh geometry={geo.joint} material={mat.joint} position={[ox * 0.42, 0.125, oz * 0.42]} quaternion={q} />
            <mesh geometry={geo.latchBand} material={mat.latch} position={[ox * 0.49, 0.126, oz * 0.49]} quaternion={q} />
            <group position={[ox * ARM_R, 0.15, oz * ARM_R]}>
              <mesh geometry={geo.armEnd} material={mat.joint} position={[0, -0.02, 0]} />
              <group position={[0, 0.015, 0]}>
                <Motor r={0.085} h={0.075} bell={mat.bell} stator={mat.copper} ring={mat.ring} />
              </group>
              <group position={[0, 0.115, 0]}>
                <Rotor
                  blade={geo.blade}
                  radius={PROP_R}
                  dir={DIRS[i]}
                  prop={mat.prop}
                  disc={mat.disc}
                  hub={mat.bell}
                  phase={i}
                  register={(g) => {
                    if (g) rotors.current[i] = g;
                  }}
                />
              </group>
              {(front || rear) && (
                <mesh
                  ref={(m) => {
                    if (m && rear && !strobes.current.includes(m)) strobes.current.push(m);
                  }}
                  geometry={geo.led}
                  material={front ? (ox > 0 ? mat.red : mat.green) : mat.white}
                  position={[0, -0.065, 0]}
                />
              )}
            </group>
            {NOZZLE_ARMS.includes(i) && (
              <group position={[ox * ARM_R, -0.09, oz * ARM_R]}>
                <mesh geometry={geo.nozzle} material={mat.nozzle} />
                <mesh geometry={geo.nozzleTip} material={mat.nozzle} position={[0, -0.05, 0]} />
              </group>
            )}
          </group>
        );
      })}
    </group>
  );
}
