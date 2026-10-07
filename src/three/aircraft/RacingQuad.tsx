"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import {
  type AircraftState, LED, beam, bladeGeometry, carbonTexture, disposeAll, extrudePlan, labelTexture, propMaterials, tube, updatePropVisuals,
} from "../kit";
import { Motor, Rotor } from "../parts";

/*
  5-inch freestyle FPV quad. Front faces +Z.
  Exposed carbon X-frame with chamfered arms, aluminium standoffs, an open
  FC/ESC stack, uptilted FPV camera, an action camera on a TPU mount,
  strapped 6S pack with XT60 lead, rear antennas and tri-blade props.
  Coloured TPU printed parts carry the page accent, as on real builds.
*/

const S = 2.5;
const MR = 0.33; // centre to motor
const ARM_DEG = 38; // from the fore-aft axis (stretched X)
const PROP_R = 0.165;
const MOTORS = [ARM_DEG, -ARM_DEG, 180 - ARM_DEG, -(180 - ARM_DEG)].map((d) => THREE.MathUtils.degToRad(d));
const DIRS: (1 | -1)[] = [-1, 1, 1, -1]; // props-out

export function RacingQuad({ state }: { state: React.RefObject<AircraftState> }) {
  const a = useMemo(() => {
    const carbon = carbonTexture(24, "#33363c", "#121315");
    carbon.repeat.set(2, 2);
    const carbonArm = carbon.clone();
    carbonArm.repeat.set(1, 4);
    const label = labelTexture(["6S 1100", "120C  LiPo"], "#1e1f22", "#d8dad7");
    const props = propMaterials("#384049", "#a0a8b2", 0.82);
    const mat = {
      carbon: new THREE.MeshStandardMaterial({ map: carbon, roughness: 0.42, metalness: 0.1 }),
      carbonArm: new THREE.MeshStandardMaterial({ map: carbonArm, roughness: 0.42, metalness: 0.1 }),
      alu: new THREE.MeshStandardMaterial({ color: "#8d939a", roughness: 0.3, metalness: 0.95 }),
      tpu: new THREE.MeshStandardMaterial({ color: "#ffb224", roughness: 0.72, metalness: 0 }),
      pcbFc: new THREE.MeshStandardMaterial({ color: "#14161a", roughness: 0.5, metalness: 0.3 }),
      pcbEsc: new THREE.MeshStandardMaterial({ color: "#1d3a2c", roughness: 0.55, metalness: 0.25 }),
      chip: new THREE.MeshStandardMaterial({ color: "#0b0c0e", roughness: 0.4, metalness: 0.4 }),
      cap: new THREE.MeshStandardMaterial({ color: "#16171a", roughness: 0.35, metalness: 0.3 }),
      bell: new THREE.MeshStandardMaterial({ color: "#2c2f35", roughness: 0.28, metalness: 0.85 }),
      ring: new THREE.MeshStandardMaterial({ color: "#c3c8ce", roughness: 0.22, metalness: 1 }),
      copper: new THREE.MeshStandardMaterial({ color: "#b06a3b", roughness: 0.3, metalness: 0.9 }),
      batt: new THREE.MeshStandardMaterial({ color: "#18191b", roughness: 0.4, metalness: 0.1 }),
      label: new THREE.MeshStandardMaterial({ map: label, roughness: 0.6 }),
      strap: new THREE.MeshStandardMaterial({ color: "#121212", roughness: 0.85 }),
      xt60: new THREE.MeshStandardMaterial({ color: "#e0b12a", roughness: 0.5 }),
      wire: new THREE.MeshStandardMaterial({ color: "#151515", roughness: 0.6 }),
      wireRed: new THREE.MeshStandardMaterial({ color: "#8f1d1d", roughness: 0.6 }),
      cam: new THREE.MeshStandardMaterial({ color: "#1e2023", roughness: 0.55, metalness: 0.2 }),
      gopro: new THREE.MeshStandardMaterial({ color: "#232528", roughness: 0.6, metalness: 0.05 }),
      glass: new THREE.MeshStandardMaterial({ color: "#05070a", roughness: 0.03, metalness: 0.5 }),
      screen: new THREE.MeshStandardMaterial({ color: "#0b0e12", roughness: 0.1, metalness: 0.2 }),
      red: LED.red(),
      ...props,
    };
    const armGeo = MOTORS.map((ang) => {
      const ox = Math.sin(ang);
      const oz = Math.cos(ang);
      return beam([ox * 0.04, 0, oz * 0.04], [ox * MR, 0, oz * MR], 0.05, 0.016, 0.82);
    });
    const geo = {
      bottom: extrudePlan([[0.05, 0.13], [0.06, 0.08], [0.06, -0.09], [0.05, -0.13], [-0.05, -0.13], [-0.06, -0.09], [-0.06, 0.08], [-0.05, 0.13]], 0.016, 0.003),
      top: extrudePlan([[0.04, 0.1], [0.05, 0.06], [0.05, -0.1], [0.04, -0.12], [-0.04, -0.12], [-0.05, -0.1], [-0.05, 0.06], [-0.04, 0.1]], 0.012, 0.003),
      arms: armGeo,
      pad: new THREE.CylinderGeometry(0.036, 0.036, 0.016, 28),
      standoff: new THREE.CylinderGeometry(0.0055, 0.0055, 0.07, 10),
      board: new THREE.BoxGeometry(0.06, 0.006, 0.06),
      chip: new THREE.BoxGeometry(0.016, 0.004, 0.016),
      capacitor: tube([0, 0.03, -0.08], [0, 0.015, -0.15], 0.011, 16),
      camBody: new THREE.BoxGeometry(0.04, 0.04, 0.036),
      camLens: new THREE.CylinderGeometry(0.013, 0.016, 0.022, 20).rotateX(Math.PI / 2),
      camGlass: new THREE.CylinderGeometry(0.011, 0.011, 0.003, 20).rotateX(Math.PI / 2),
      sidePlate: extrudePlan([[0.004, 0.03], [0.004, -0.03], [-0.004, -0.03], [-0.004, 0.03]], 0.055, 0.002),
      gpLens: new THREE.CylinderGeometry(0.014, 0.016, 0.012, 24).rotateX(Math.PI / 2),
      gpScreen: new THREE.BoxGeometry(0.034, 0.03, 0.002),
      gpMount: new THREE.BoxGeometry(0.07, 0.016, 0.06),
      battLabel: new THREE.BoxGeometry(0.082, 0.001, 0.09),
      strap: new THREE.BoxGeometry(0.088, 0.068, 0.018),
      buckle: new THREE.BoxGeometry(0.02, 0.004, 0.022),
      xt60: new THREE.BoxGeometry(0.016, 0.008, 0.02),
      leadBlack: tube([0.006, 0.12, -0.13], [0.006, 0.07, -0.15], 0.0045),
      leadRed: tube([-0.006, 0.12, -0.13], [-0.006, 0.07, -0.15], 0.0045),
      antenna: [1, -1].map((sx) => tube([sx * 0.03, 0.06, -0.11], [sx * 0.065, 0.13, -0.19], 0.004, 8, 0.0025)),
      antCap: new THREE.CylinderGeometry(0.006, 0.006, 0.02, 10),
      antMount: new THREE.BoxGeometry(0.09, 0.018, 0.028),
      escWires: MOTORS.map((ang) => {
        const ox = Math.sin(ang);
        const oz = Math.cos(ang);
        return tube([ox * 0.05, 0.012, oz * 0.05], [ox * (MR - 0.04), 0.012, oz * (MR - 0.04)], 0.004);
      }),
      led: new THREE.SphereGeometry(0.006, 8, 8),
      blade: bladeGeometry({ R: PROP_R, root: 0.018, chord: 0.038, tipChord: 0.022, twistRoot: 0.42, twistTip: 0.2, droop: 0.002, sweep: -0.02 }),
    };
    return { mat, geo };
  }, []);
  useEffect(() => () => disposeAll(a), [a]);
  const { mat, geo } = a;

  const rotors = useRef<THREE.Group[]>([]);

  useFrame((_, delta) => {
    const st = state.current;
    if (!st) return;
    const dt = Math.min(delta, 0.05);
    rotors.current.forEach((r, i) => r && (r.rotation.y += DIRS[i] * st.lift * 75 * dt));
    updatePropVisuals(st.lift, mat, 0.82, 0.3);
  });

  return (
    <group scale={S}>
      {/* frame */}
      <mesh geometry={geo.bottom} material={mat.carbon} />
      {geo.arms.map((g, i) => (
        <mesh key={i} geometry={g} material={mat.carbonArm} />
      ))}
      <mesh geometry={geo.top} material={mat.carbon} position={[0, 0.072, -0.01]} />
      {[
        [0.042, 0.08],
        [-0.042, 0.08],
        [0.042, -0.1],
        [-0.042, -0.1],
      ].map(([x, z]) => (
        <mesh key={`${x}${z}`} geometry={geo.standoff} material={mat.alu} position={[x, 0.037, z]} />
      ))}

      {/* stack + wiring */}
      <mesh geometry={geo.board} material={mat.pcbEsc} position={[0, 0.02, -0.01]} />
      <mesh geometry={geo.board} material={mat.pcbFc} position={[0, 0.042, -0.01]} />
      <mesh geometry={geo.chip} material={mat.chip} position={[0, 0.047, -0.01]} />
      <mesh geometry={geo.capacitor} material={mat.cap} />
      {geo.escWires.map((g, i) => (
        <mesh key={i} geometry={g} material={mat.wire} />
      ))}
      <mesh geometry={geo.led} material={mat.red} position={[0, 0.01, -0.13]} />

      {/* FPV camera, uptilted between TPU side plates */}
      <group position={[0, 0.038, 0.11]}>
        {[0.028, -0.028].map((x) => (
          <mesh key={x} geometry={geo.sidePlate} material={mat.tpu} position={[x, 0, 0]} />
        ))}
        <group rotation={[-0.45, 0, 0]}>
          <mesh geometry={geo.camBody} material={mat.cam} />
          <mesh geometry={geo.camLens} material={mat.cam} position={[0, 0, 0.028]} />
          <mesh geometry={geo.camGlass} material={mat.glass} position={[0, 0, 0.04]} />
        </group>
      </group>

      {/* action camera on a TPU mount */}
      <group position={[0, 0.12, 0.05]} rotation={[-0.3, 0, 0]}>
        <mesh geometry={geo.gpMount} material={mat.tpu} position={[0, -0.03, -0.01]} />
        <RoundedBox args={[0.072, 0.052, 0.04]} radius={0.007} smoothness={3} material={mat.gopro} />
        <mesh geometry={geo.gpLens} material={mat.cam} position={[-0.016, 0.008, 0.024]} />
        <mesh geometry={geo.gpScreen} material={mat.screen} position={[0.016, 0.004, 0.0205]} />
      </group>

      {/* 6S pack, strap, XT60 lead */}
      <group position={[0, 0.112, -0.055]}>
        <RoundedBox args={[0.084, 0.064, 0.13]} radius={0.008} smoothness={3} material={mat.batt} />
        <mesh geometry={geo.battLabel} material={mat.label} position={[0, 0.0325, 0]} />
        <mesh geometry={geo.strap} material={mat.strap} position={[0, -0.002, 0.02]} />
        <mesh geometry={geo.buckle} material={mat.tpu} position={[0, 0.034, 0.02]} />
      </group>
      <mesh geometry={geo.leadBlack} material={mat.wire} />
      <mesh geometry={geo.leadRed} material={mat.wireRed} />
      <mesh geometry={geo.xt60} material={mat.xt60} position={[0, 0.068, -0.152]} />

      {/* receiver antennas in a TPU mount */}
      <mesh geometry={geo.antMount} material={mat.tpu} position={[0, 0.07, -0.11]} />
      {geo.antenna.map((g, i) => (
        <mesh key={i} geometry={g} material={mat.wire} />
      ))}
      {[1, -1].map((sx) => (
        <mesh key={sx} geometry={geo.antCap} material={mat.strap} position={[sx * 0.066, 0.132, -0.192]} rotation={[-0.85, 0, sx * -0.4]} />
      ))}

      {/* motors + props */}
      {MOTORS.map((ang, i) => {
        const ox = Math.sin(ang);
        const oz = Math.cos(ang);
        return (
          <group key={i} position={[ox * MR, 0, oz * MR]}>
            <mesh geometry={geo.pad} material={mat.carbon} />
            <group position={[0, 0.008, 0]}>
              <Motor r={0.028} h={0.034} bell={mat.bell} stator={mat.copper} ring={mat.ring} />
            </group>
            <group position={[0, 0.054, 0]}>
              <Rotor
                blade={geo.blade}
                blades={3}
                radius={PROP_R}
                dir={DIRS[i]}
                prop={mat.prop}
                disc={mat.disc}
                hub={mat.bell}
                phase={i * 0.5}
                register={(g) => {
                  if (g) rotors.current[i] = g;
                }}
              />
            </group>
          </group>
        );
      })}
    </group>
  );
}
