"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { type AircraftState, LED, bladeGeometry, carbonTexture, disposeAll, extrudePlan, extrudeProfile, propMaterials, strobeOn, tube, updatePropVisuals } from "../kit";
import { Motor, Rotor } from "../parts";

/*
  Quadplane VTOL for long-range mapping. Front faces +Z.
  Composite fuselage with nose turret and pitot, high wing with dihedral,
  twin carbon booms carrying four lift motors, twin fins joined by a
  stabiliser, and a pusher motor in the tail.

  In cruise the lift rotors stop and park fore-aft to cut drag, and the
  pusher takes over. AircraftState.cruise drives that hand-over.
*/

const BOOM_X = 0.56;
const LIFT_Z = [0.56, -0.74];
const PROP_R = 0.36;
const LIFT = [1, -1].flatMap((sx) => LIFT_Z.map((z) => ({ x: sx * BOOM_X, z })));
const LIFT_DIR: (1 | -1)[] = [1, -1, -1, 1];

// Fuselage side silhouette radius along its length (nose +z).
const FUSE: [number, number][] = [
  [0, 0.8], [0.04, 0.78], [0.075, 0.7], [0.1, 0.56], [0.115, 0.36], [0.118, 0.1], [0.108, -0.2], [0.085, -0.48], [0.055, -0.7], [0.036, -0.78], [0, -0.79],
];

function wingHalf(sign: 1 | -1) {
  const pts: [number, number][] = [
    [0.02, 0.2], [1.5, 0.1], [1.58, 0.07], [1.6, 0.0], [1.58, -0.07], [1.5, -0.09], [0.02, -0.16],
  ];
  return extrudePlan(pts.map(([x, z]) => [x * sign, z] as [number, number]), 0.036, 0.016, 1, 12);
}

export function Vtol({ state }: { state: React.RefObject<AircraftState> }) {
  const a = useMemo(() => {
    const carbon = carbonTexture(16);
    carbon.repeat.set(1, 10);
    const props = propMaterials("#17181b", "#9aa0a6");
    const pusherProps = propMaterials("#17181b", "#9aa0a6");
    const mat = {
      skin: new THREE.MeshStandardMaterial({ color: "#dcdedb", roughness: 0.38, metalness: 0.02 }),
      skinDark: new THREE.MeshStandardMaterial({ color: "#3a3d42", roughness: 0.55, metalness: 0.1 }),
      hinge: new THREE.MeshStandardMaterial({ color: "#9a9d9b", roughness: 0.5, metalness: 0.1 }),
      carbon: new THREE.MeshStandardMaterial({ map: carbon, roughness: 0.4, metalness: 0.15 }),
      pod: new THREE.MeshStandardMaterial({ color: "#1c1e21", roughness: 0.55, metalness: 0.15 }),
      bell: new THREE.MeshStandardMaterial({ color: "#2f3236", roughness: 0.32, metalness: 0.8 }),
      ring: new THREE.MeshStandardMaterial({ color: "#b4b8bd", roughness: 0.25, metalness: 0.95 }),
      copper: new THREE.MeshStandardMaterial({ color: "#8a5a3c", roughness: 0.35, metalness: 0.85 }),
      turret: new THREE.MeshStandardMaterial({ color: "#2a2c30", roughness: 0.4, metalness: 0.2 }),
      glass: new THREE.MeshStandardMaterial({ color: "#05070a", roughness: 0.03, metalness: 0.5 }),
      steel: new THREE.MeshStandardMaterial({ color: "#c5c9ce", roughness: 0.2, metalness: 1 }),
      red: LED.red(),
      green: LED.green(),
      white: LED.white(),
      prop: props.prop,
      disc: props.disc,
      pusherProp: pusherProps.prop,
      pusherDisc: pusherProps.disc,
      textures: [...props.textures, ...pusherProps.textures],
    };
    const lathe = new THREE.LatheGeometry(FUSE.map(([r, y]) => new THREE.Vector2(r, y)), 48);
    lathe.rotateX(Math.PI / 2);
    lathe.scale(1, 0.92, 1); // slightly oval cross-section
    const geo = {
      fuselage: lathe,
      wingL: wingHalf(1),
      wingR: wingHalf(-1),
      aileron: new THREE.BoxGeometry(0.55, 0.004, 0.006),
      booms: [1, -1].map((sx) => tube([sx * BOOM_X, 0.03, 0.66], [sx * BOOM_X, 0.03, -1.02], 0.022, 16)),
      boomCap: new THREE.SphereGeometry(0.022, 16, 10),
      fin: extrudeProfile([[-0.86, 0.03], [-1.02, 0.03], [-1.08, 0.27], [-0.99, 0.27]], 0.014, 0.004),
      stab: extrudePlan([[0.6, -0.96], [0.6, -1.06], [-0.6, -1.06], [-0.6, -0.96]], 0.016, 0.006),
      turret: new THREE.SphereGeometry(0.058, 32, 20),
      window: new THREE.CylinderGeometry(0.028, 0.028, 0.01, 24).rotateX(Math.PI / 2),
      pitot: tube([0, -0.005, 0.79], [0, -0.005, 0.9], 0.004, 8),
      mount: new THREE.CylinderGeometry(0.05, 0.05, 0.02, 24),
      foot: new THREE.BoxGeometry(0.03, 0.06, 0.012),
      led: new THREE.SphereGeometry(0.012, 10, 10),
      blade: bladeGeometry({ R: PROP_R, root: 0.035, chord: 0.06, tipChord: 0.02, droop: 0.008 }),
      pusherBlade: bladeGeometry({ R: 0.2, root: 0.025, chord: 0.045, tipChord: 0.018, twistRoot: 0.5, twistTip: 0.22, droop: 0 }),
    };
    return { mat, geo };
  }, []);
  useEffect(() => () => disposeAll(a), [a]);
  const { mat, geo } = a;

  const lift = useRef<THREE.Group[]>([]);
  const pusher = useRef<THREE.Group>(null);
  const tail = useRef<THREE.Mesh>(null);
  const pusherMats = useMemo(() => ({ prop: mat.pusherProp, disc: mat.pusherDisc }), [mat]);

  useFrame((_, delta) => {
    const st = state.current;
    if (!st) return;
    const dt = Math.min(delta, 0.05);
    const liftSpool = st.lift;
    lift.current.forEach((r, i) => {
      if (!r) return;
      if (liftSpool > 0.04) r.rotation.y += LIFT_DIR[i] * liftSpool * 55 * dt;
      else {
        // Parked: settle blades along the boom (fore-aft) to cut drag in cruise.
        const target = Math.round((r.rotation.y - Math.PI / 2) / Math.PI) * Math.PI + Math.PI / 2;
        r.rotation.y = THREE.MathUtils.damp(r.rotation.y, target, 4, dt);
      }
    });
    updatePropVisuals(liftSpool, mat);
    if (pusher.current) pusher.current.rotation.y += st.cruise * 70 * dt;
    updatePropVisuals(st.cruise, pusherMats, 1, 0.3);
    if (tail.current) tail.current.visible = strobeOn(st.t, 1.4);
  });

  return (
    <group>
      {/* fuselage, nose turret, pitot */}
      <mesh geometry={geo.fuselage} material={mat.skin} />
      <mesh geometry={geo.turret} material={mat.turret} position={[0, -0.09, 0.42]} />
      <mesh geometry={geo.window} material={mat.glass} position={[0, -0.1, 0.475]} />
      <mesh geometry={geo.pitot} material={mat.steel} />

      {/* high wing with dihedral, aileron hinge lines, wingtip lights */}
      <group position={[0, 0.1, 0.06]}>
        <mesh geometry={geo.wingL} material={mat.skin} rotation={[0, 0, 0.05]} />
        <mesh geometry={geo.wingR} material={mat.skin} rotation={[0, 0, -0.05]} />
        {[1, -1].map((sx) => (
          <group key={sx} rotation={[0, 0, sx * 0.05]}>
            <mesh geometry={geo.aileron} material={mat.hinge} position={[sx * 1.18, 0.019, -0.105]} />
            <mesh geometry={geo.led} material={sx > 0 ? mat.red : mat.green} position={[sx * 1.6, 0, 0]} />
          </group>
        ))}
      </group>

      {/* booms, tail feathers */}
      {geo.booms.map((g, i) => (
        <mesh key={i} geometry={g} material={mat.carbon} />
      ))}
      {[1, -1].map((sx) => (
        <group key={sx}>
          <mesh geometry={geo.boomCap} material={mat.skinDark} position={[sx * BOOM_X, 0.03, 0.66]} />
          <mesh geometry={geo.fin} material={mat.skin} position={[sx * BOOM_X, 0, 0]} />
          <mesh geometry={geo.foot} material={mat.pod} position={[sx * BOOM_X, -0.02, 0.2]} />
          <mesh geometry={geo.foot} material={mat.pod} position={[sx * BOOM_X, -0.02, -0.5]} />
        </group>
      ))}
      <mesh geometry={geo.stab} material={mat.skin} position={[0, 0.265, 0]} />
      <mesh ref={tail} geometry={geo.led} material={mat.white} position={[0, 0.28, -1.06]} />

      {/* lift motors on the booms */}
      {LIFT.map((m, i) => (
        <group key={i} position={[m.x, 0.05, m.z]}>
          <mesh geometry={geo.mount} material={mat.pod} />
          <group position={[0, 0.01, 0]}>
            <Motor r={0.05} h={0.05} bell={mat.bell} stator={mat.copper} ring={mat.ring} />
          </group>
          <group position={[0, 0.072, 0]}>
            <Rotor
              blade={geo.blade}
              radius={PROP_R}
              dir={LIFT_DIR[i]}
              prop={mat.prop}
              disc={mat.disc}
              hub={mat.bell}
              phase={Math.PI / 2}
              register={(g) => {
                if (g) lift.current[i] = g;
              }}
            />
          </group>
        </group>
      ))}

      {/* pusher in the tail cone */}
      <group position={[0, 0, -0.8]} rotation={[-Math.PI / 2, 0, 0]}>
        <Motor r={0.04} h={0.04} bell={mat.bell} stator={mat.copper} ring={mat.ring} />
        <group position={[0, 0.06, 0]}>
          <Rotor
            blade={geo.pusherBlade}
            radius={0.2}
            prop={mat.pusherProp}
            disc={mat.pusherDisc}
            hub={mat.bell}
            register={(g) => {
              pusher.current = g;
            }}
          />
        </group>
      </group>
    </group>
  );
}
