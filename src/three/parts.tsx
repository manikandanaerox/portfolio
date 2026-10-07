"use client";

import { useMemo } from "react";
import * as THREE from "three";

/*
  Reusable JSX parts. Geometry here is small and per-instance memoised;
  materials always come from the owning aircraft so it can drive opacity.
*/

type RotorProps = {
  blade: THREE.BufferGeometry;
  blades?: number;
  dir?: 1 | -1; // spin direction; mirrors the blade so pitch matches
  radius: number;
  prop: THREE.Material;
  disc: THREE.Material;
  hub: THREE.Material;
  tip?: THREE.Material; // optional tip marker
  phase?: number;
  axis?: "y" | "z"; // lift rotor (y) or pusher (z)
  register: (g: THREE.Group | null) => void;
};

export function Rotor({ blade, blades = 2, dir = 1, radius, prop, disc, hub, tip, phase = 0, axis = "y", register }: RotorProps) {
  const g = useMemo(
    () => ({
      hub: new THREE.CylinderGeometry(radius * 0.07, radius * 0.08, radius * 0.06, 20),
      cap: new THREE.CylinderGeometry(radius * 0.03, radius * 0.05, radius * 0.04, 16),
      disc: new THREE.CircleGeometry(radius * 1.01, 72).rotateX(-Math.PI / 2),
      tip: new THREE.BoxGeometry(radius * 0.08, radius * 0.02, radius * 0.05),
    }),
    [radius],
  );
  return (
    <group rotation={axis === "z" ? [Math.PI / 2, 0, 0] : [0, 0, 0]}>
      <group ref={register} rotation={[0, phase, 0]}>
        <mesh geometry={g.hub} material={hub} />
        <mesh geometry={g.cap} material={hub} position={[0, radius * 0.05, 0]} />
        {Array.from({ length: blades }, (_, i) => (
          <group key={i} rotation={[0, (i / blades) * Math.PI * 2, 0]} scale={[1, 1, dir]}>
            <mesh geometry={blade} material={prop} />
            {tip && <mesh geometry={g.tip} material={tip} position={[radius * 0.9, 0.003, 0.004]} />}
          </group>
        ))}
      </group>
      <mesh geometry={g.disc} material={disc} position={[0, 0.003, 0]} renderOrder={2} />
    </group>
  );
}

type MotorProps = {
  r: number; // bell radius
  h: number; // bell height
  bell: THREE.Material;
  stator?: THREE.Material;
  ring?: THREE.Material;
  base?: THREE.Material;
};

/** Outrunner motor: mount, copper stator peeking under the bell, machined top ring. */
export function Motor({ r, h, bell, stator, ring, base }: MotorProps) {
  const g = useMemo(
    () => ({
      base: new THREE.CylinderGeometry(r * 1.05, r * 1.1, h * 0.25, 32),
      stator: new THREE.CylinderGeometry(r * 0.86, r * 0.86, h * 0.35, 32),
      bell: new THREE.CylinderGeometry(r * 0.96, r, h * 0.62, 40, 1, true),
      top: new THREE.CylinderGeometry(r * 0.7, r * 0.96, h * 0.12, 40),
      ring: new THREE.TorusGeometry(r * 0.83, r * 0.06, 8, 40),
      shaft: new THREE.CylinderGeometry(r * 0.12, r * 0.12, h * 0.3, 12),
    }),
    [r, h],
  );
  return (
    <group>
      {base && <mesh geometry={g.base} material={base} position={[0, h * 0.125, 0]} />}
      {stator && <mesh geometry={g.stator} material={stator} position={[0, h * 0.4, 0]} />}
      <mesh geometry={g.bell} material={bell} position={[0, h * 0.58, 0]} />
      <mesh geometry={g.top} material={bell} position={[0, h * 0.95, 0]} />
      {ring && <mesh geometry={g.ring} material={ring} position={[0, h * 1.01, 0]} rotation={[Math.PI / 2, 0, 0]} />}
      <mesh geometry={g.shaft} material={ring ?? bell} position={[0, h * 1.1, 0]} />
    </group>
  );
}
