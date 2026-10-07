"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import type { PartKey } from "../../content";
import { crease, type AircraftState } from "../kit";

/*
  Industrial inspection quadcopter (Matrice / Astro class), built procedurally.
  Front faces +Z. Matte composite fuselage, carbon arm tubes with folding
  hinges, enclosed motor pods, large slender props, dual hot-swap batteries,
  stereo obstacle sensors, ball gimbal payload and T-leg landing gear.

  Every explodable part group carries a direction in the registry; the parent
  writes DroneState each frame and this component mutates transforms only.
*/



const ARM_R = 1.08; // centre to motor axis
const ARM_ROOT = 0.34;
const ARM_Y = 0.02;
const ARM_RISE = 0.035; // slight dihedral
const PROP_R = 0.6;
// Front-left, front-right, rear-left, rear-right (X layout, angle from +Z).
const ARM_ANGLES = [40, -40, 140, -140].map((d) => THREE.MathUtils.degToRad(d));
const SPIN_DIR = [1, -1, -1, 1];
const MOTOR_TOP = ARM_Y + ARM_RISE + 0.12;
const UP = new THREE.Vector3(0, 1, 0);

// ---------- procedural textures ----------

/** Fine 2x2 twill, satin finish. Small cells so it reads as weave, not a checkerboard. */
function makeCarbonTexture() {
  const s = 128;
  const c = document.createElement("canvas");
  c.width = c.height = s;
  const g = c.getContext("2d")!;
  const n = 16;
  const cell = s / n;
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const along = Math.floor((x + y) / 2) % 2 === 0;
      const x0 = x * cell;
      const y0 = y * cell;
      const grad = along ? g.createLinearGradient(x0, y0, x0, y0 + cell) : g.createLinearGradient(x0, y0, x0 + cell, y0);
      grad.addColorStop(0, "#16181b");
      grad.addColorStop(0.5, "#2b2e33");
      grad.addColorStop(1, "#16181b");
      g.fillStyle = grad;
      g.fillRect(x0, y0, cell, cell);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/** Spinning-prop disc: faint, brighter toward the tips where blade speed is highest. */
function makeDiscTexture() {
  const s = 256;
  const c = document.createElement("canvas");
  c.width = c.height = s;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  grad.addColorStop(0, "rgba(255,255,255,0)");
  grad.addColorStop(0.1, "rgba(255,255,255,0)");
  grad.addColorStop(0.18, "rgba(255,255,255,0.35)");
  grad.addColorStop(0.7, "rgba(255,255,255,0.22)");
  grad.addColorStop(0.9, "rgba(255,255,255,0.4)");
  grad.addColorStop(0.96, "rgba(255,255,255,0.12)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, s, s);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// ---------- geometry builders ----------

/** Fuselage plan view: long chamfered octagon, narrower at the nose. */
function fuselageShape(scale = 1) {
  const pts: [number, number][] = [
    [0.17, 0.44],
    [0.27, 0.3],
    [0.29, -0.22],
    [0.2, -0.42],
    [-0.2, -0.42],
    [-0.29, -0.22],
    [-0.27, 0.3],
    [-0.17, 0.44],
  ];
  const s = new THREE.Shape();
  pts.forEach(([x, z], i) => (i ? s.lineTo(x * scale, -z * scale) : s.moveTo(x * scale, -z * scale)));
  s.closePath();
  return s;
}

/** Plan shape extruded upward with a soft chamfer, centred on y = 0. */
function extrudeFlat(shape: THREE.Shape, height: number, bevel: number) {
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: height - bevel * 2,
    bevelEnabled: true,
    bevelSize: bevel,
    bevelThickness: bevel,
    bevelSegments: 4,
    curveSegments: 6,
  });
  g.rotateX(-Math.PI / 2);
  g.translate(0, -height / 2 + bevel, 0);
  return crease(g);
}

/** Slender two-blade prop: wide near the root, tapering, with pitch twist and slight droop. */
function bladeGeometry() {
  const s = new THREE.Shape();
  const R = PROP_R;
  s.moveTo(0.04, -0.018);
  s.bezierCurveTo(0.12, -0.05, 0.22, -0.045, R * 0.6, -0.03);
  s.bezierCurveTo(R * 0.85, -0.02, R * 0.97, -0.016, R, -0.004);
  s.quadraticCurveTo(R + 0.004, 0.008, R * 0.97, 0.014);
  s.bezierCurveTo(R * 0.8, 0.02, R * 0.5, 0.03, 0.2, 0.034);
  s.bezierCurveTo(0.1, 0.034, 0.06, 0.026, 0.04, 0.018);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, {
    depth: 0.005,
    bevelEnabled: true,
    bevelSize: 0.0025,
    bevelThickness: 0.002,
    bevelSegments: 2,
    curveSegments: 20,
  });
  g.translate(0, 0, -0.0025);
  g.rotateX(-Math.PI / 2);
  const pos = g.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const t = THREE.MathUtils.clamp(v.x / R, 0, 1);
    const a = THREE.MathUtils.lerp(0.32, 0.09, t); // twist: steep at the root, flat at the tip
    const y = v.y * Math.cos(a) - v.z * Math.sin(a);
    const z = v.y * Math.sin(a) + v.z * Math.cos(a);
    pos.setXYZ(i, v.x, y - t * t * 0.01, z);
  }
  return crease(g, Math.PI / 3);
}

/** Cylinder spanning two points. */
function tube(a: THREE.Vector3, b: THREE.Vector3, r: number, seg = 16) {
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length();
  const g = new THREE.CylinderGeometry(r, r, len, seg, 1);
  g.translate(0, len / 2, 0);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(UP, dir.normalize()));
  g.translate(a.x, a.y, a.z);
  return g;
}

// ---------- component ----------

type PartData = { key: PartKey | "cover" | "gear"; dir: [number, number, number] };

export function InspectionQuad({ state }: { state: React.RefObject<AircraftState> }) {
  const assets = useMemo(() => {
    const carbon = makeCarbonTexture();
    carbon.repeat.set(1, 6);
    const discTex = makeDiscTexture();

    const mat = {
      composite: new THREE.MeshStandardMaterial({
        color: "#2b2e32", roughness: 0.62, metalness: 0.04,
      }),
      cover: new THREE.MeshStandardMaterial({ color: "#3a3e43", roughness: 0.55, metalness: 0.05 }),
      panel: new THREE.MeshStandardMaterial({ color: "#1d1f22", roughness: 0.75, metalness: 0.05 }),
      carbon: new THREE.MeshStandardMaterial({ map: carbon, roughness: 0.4, metalness: 0.15 }),
      hinge: new THREE.MeshStandardMaterial({ color: "#24272b", roughness: 0.5, metalness: 0.25 }),
      sleeve: new THREE.MeshStandardMaterial({ color: "#8e9399", roughness: 0.38, metalness: 0.7 }),
      pod: new THREE.MeshStandardMaterial({ color: "#1b1d20", roughness: 0.6, metalness: 0.1 }),
      bell: new THREE.MeshStandardMaterial({ color: "#3b3f45", roughness: 0.34, metalness: 0.75 }),
      prop: new THREE.MeshStandardMaterial({ color: "#141518", roughness: 0.42, metalness: 0.05, transparent: true }),
      propTip: new THREE.MeshStandardMaterial({ color: "#ffb224", roughness: 0.5, metalness: 0, transparent: true }),
      disc: new THREE.MeshBasicMaterial({ map: discTex, color: "#9aa0a6", transparent: true, depthWrite: false, opacity: 0, side: THREE.DoubleSide }),
      battery: new THREE.MeshStandardMaterial({ color: "#202225", roughness: 0.48, metalness: 0.05 }),
      label: new THREE.MeshStandardMaterial({ color: "#c7c9c6", roughness: 0.7, metalness: 0 }),
      sensor: new THREE.MeshStandardMaterial({ color: "#040506", roughness: 0.06, metalness: 0.6 }),
      payload: new THREE.MeshStandardMaterial({ color: "#c4c6c3", roughness: 0.5, metalness: 0.1 }),
      rubber: new THREE.MeshStandardMaterial({ color: "#121314", roughness: 0.92, metalness: 0 }),
      pcb: new THREE.MeshStandardMaterial({ color: "#163a2c", roughness: 0.6, metalness: 0.2 }),
      chip: new THREE.MeshStandardMaterial({ color: "#0e0f11", roughness: 0.45, metalness: 0.4 }),
      gold: new THREE.MeshStandardMaterial({ color: "#b8933d", roughness: 0.35, metalness: 1 }),
      ledRed: new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 0.2, 0.12), toneMapped: false }),
      ledGreen: new THREE.MeshBasicMaterial({ color: new THREE.Color(0.15, 3, 0.8), toneMapped: false }),
      ledWhite: new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 3.2, 3.2), toneMapped: false }),
    };

    const armDirs = ARM_ANGLES.map((a) => new THREE.Vector3(Math.sin(a), ARM_RISE / ARM_R, Math.cos(a)).normalize());
    const armTubes = ARM_ANGLES.map((a) => {
      const ox = Math.sin(a);
      const oz = Math.cos(a);
      return tube(
        new THREE.Vector3(ox * ARM_ROOT, ARM_Y, oz * ARM_ROOT),
        new THREE.Vector3(ox * (ARM_R - 0.06), ARM_Y + ARM_RISE, oz * (ARM_R - 0.06)),
        0.03,
      );
    });
    // Folding-lock sleeves sit around each tube just outside the hinge.
    const sleeveQuats = armDirs.map((d) => new THREE.Quaternion().setFromUnitVectors(UP, d));

    const legs = [1, -1].flatMap((sx) => [
      tube(new THREE.Vector3(sx * 0.15, -0.08, 0.02), new THREE.Vector3(sx * 0.31, -0.52, 0.02), 0.022),
      tube(new THREE.Vector3(sx * 0.15, -0.09, 0.02), new THREE.Vector3(sx * 0.15, -0.16, 0.02), 0.032),
    ]);

    const geo = {
      fuselage: extrudeFlat(fuselageShape(1), 0.17, 0.035),
      belly: extrudeFlat(fuselageShape(0.84), 0.04, 0.012),
      cover: extrudeFlat(fuselageShape(0.86), 0.05, 0.016),
      vent: new THREE.BoxGeometry(0.16, 0.006, 0.012),
      sensorFront: new THREE.BoxGeometry(0.05, 0.034, 0.012),
      sensorSide: new THREE.BoxGeometry(0.012, 0.034, 0.05),
      sensorDown: new THREE.BoxGeometry(0.05, 0.01, 0.05),
      armTubes,
      sleeve: new THREE.CylinderGeometry(0.041, 0.041, 0.07, 24),
      podBody: new THREE.CylinderGeometry(0.078, 0.07, 0.1, 32),
      podCap: new THREE.SphereGeometry(0.07, 24, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2),
      podClamp: new THREE.BoxGeometry(0.075, 0.05, 0.1),
      bell: new THREE.CylinderGeometry(0.07, 0.074, 0.04, 40),
      bellRing: new THREE.TorusGeometry(0.072, 0.004, 8, 40),
      hub: new THREE.CylinderGeometry(0.036, 0.04, 0.026, 24),
      hubCap: new THREE.CylinderGeometry(0.018, 0.026, 0.014, 20),
      blade: bladeGeometry(),
      tip: new THREE.BoxGeometry(0.045, 0.012, 0.03),
      disc: new THREE.CircleGeometry(PROP_R + 0.01, 72).rotateX(-Math.PI / 2),
      led: new THREE.SphereGeometry(0.014, 12, 12),
      batteryLabel: new THREE.BoxGeometry(0.07, 0.002, 0.12),
      latch: new THREE.BoxGeometry(0.06, 0.03, 0.03),
      pcb: new THREE.BoxGeometry(0.3, 0.01, 0.42),
      chipL: new THREE.BoxGeometry(0.07, 0.01, 0.07),
      chipS: new THREE.BoxGeometry(0.035, 0.008, 0.025),
      conn: new THREE.BoxGeometry(0.06, 0.014, 0.018),
      mast: new THREE.CylinderGeometry(0.009, 0.011, 0.13, 10),
      gnss: new THREE.CylinderGeometry(0.048, 0.052, 0.022, 32),
      gnssTop: new THREE.CylinderGeometry(0.04, 0.04, 0.003, 32),
      legs,
      skid: new THREE.CylinderGeometry(0.02, 0.02, 0.74, 16).rotateX(Math.PI / 2),
      skidCap: new THREE.CapsuleGeometry(0.024, 0.04, 6, 12).rotateX(Math.PI / 2),
      damperPlate: new THREE.BoxGeometry(0.16, 0.014, 0.12),
      damper: new THREE.SphereGeometry(0.016, 12, 10),
      yoke: new THREE.BoxGeometry(0.03, 0.08, 0.05),
      ball: new THREE.SphereGeometry(0.075, 40, 28),
      window: new THREE.CylinderGeometry(0.04, 0.04, 0.012, 32).rotateX(Math.PI / 2),
      windowSmall: new THREE.CylinderGeometry(0.017, 0.017, 0.012, 24).rotateX(Math.PI / 2),
    };
    return { mat, geo, sleeveQuats, textures: [carbon, discTex] };
  }, []);

  useEffect(
    () => () => {
      Object.values(assets.mat).forEach((m) => m.dispose());
      Object.values(assets.geo).forEach((g) => (Array.isArray(g) ? g.forEach((x) => x.dispose()) : g.dispose()));
      assets.textures.forEach((t) => t.dispose());
    },
    [assets],
  );

  const { mat, geo, sleeveQuats } = assets;

  const parts = useRef<{ obj: THREE.Object3D; base: THREE.Vector3; data: PartData; pop: number }[]>([]);
  const reg = (data: PartData) => (obj: THREE.Object3D | null) => {
    if (!obj || parts.current.some((p) => p.obj === obj)) return;
    parts.current.push({ obj, base: obj.position.clone(), data, pop: 0 });
  };

  const rotors = useRef<THREE.Group[]>([]);
  const strobes = useRef<THREE.Mesh[]>([]);
  const gimbal = useRef<THREE.Group>(null);
  const tmp = useMemo(() => new THREE.Vector3(), []);

  useFrame((s, delta) => {
    const st = state.current;
    if (!st) return;
    const dt = Math.min(delta, 0.05);
    const t = s.clock.elapsedTime;

    for (const p of parts.current) {
      const isActive = st.active !== null && (p.data.key === st.active || (st.active === "fc" && p.data.key === "cover"));
      p.pop = THREE.MathUtils.damp(p.pop, isActive ? 1 : 0, 6, dt);
      tmp.set(...p.data.dir).multiplyScalar(st.explode * (1 + p.pop * 0.35));
      p.obj.position.copy(p.base).add(tmp);
    }

    // At hover the blades read as a disc; below ~20% spool they become visible.
    const speed = st.lift * 52;
    rotors.current.forEach((r, i) => (r.rotation.y += SPIN_DIR[i] * speed * dt));
    const blur = THREE.MathUtils.smoothstep(st.lift, 0.2, 0.8);
    mat.disc.opacity = blur * 0.26;
    mat.prop.opacity = 1 - blur * 0.88;
    mat.propTip.opacity = 1 - blur * 0.7;

    // Anti-collision strobes: double flash every 1.3 s.
    const ph = t % 1.3;
    const on = ph < 0.05 || (ph > 0.14 && ph < 0.19);
    strobes.current.forEach((m) => (m.visible = on));

    if (gimbal.current) gimbal.current.rotation.x = THREE.MathUtils.damp(gimbal.current.rotation.x, st.gimbalPitch, 12, dt);
  });

  return (
    <group>
      {/* ---------- fuselage, hinges, sensors (frame) ---------- */}
      <group ref={reg({ key: "frame", dir: [0, 0, 0] })}>
        <mesh geometry={geo.fuselage} material={mat.composite} />
        <mesh geometry={geo.belly} material={mat.panel} position={[0, -0.1, 0]} />
        {[-0.07, 0.07].map((x) => (
          <mesh key={`f${x}`} geometry={geo.sensorFront} material={mat.sensor} position={[x, 0.005, 0.442]} />
        ))}
        {[-1, 1].map((sx) =>
          [0.08, -0.08].map((z) => (
            <mesh key={`s${sx}${z}`} geometry={geo.sensorSide} material={mat.sensor} position={[sx * 0.292, 0.005, z]} />
          )),
        )}
        {[0.12, -0.12].map((z) => (
          <mesh key={`d${z}`} geometry={geo.sensorDown} material={mat.sensor} position={[0, -0.121, z]} />
        ))}
        {ARM_ANGLES.map((a, i) => {
          const ox = Math.sin(a);
          const oz = Math.cos(a);
          return (
            <group key={i}>
              <RoundedBox args={[0.11, 0.09, 0.13]} radius={0.02} smoothness={3} material={mat.hinge} position={[ox * 0.3, ARM_Y, oz * 0.3]} rotation={[0, a, 0]} />
              <mesh geometry={geo.sleeve} material={mat.sleeve} position={[ox * 0.42, ARM_Y + 0.004, oz * 0.42]} quaternion={sleeveQuats[i]} />
            </group>
          );
        })}
      </group>

      {ARM_ANGLES.map((a, i) => {
        const ox = Math.sin(a);
        const oz = Math.cos(a);
        const front = oz > 0;
        return (
          <group key={i}>
            <mesh ref={reg({ key: "frame", dir: [ox * 0.16, 0, oz * 0.16] })} geometry={geo.armTubes[i]} material={mat.carbon} />

            {/* motor pod */}
            <group ref={reg({ key: "motors", dir: [ox * 0.3, 0.38, oz * 0.3] })} position={[ox * ARM_R, ARM_Y + ARM_RISE, oz * ARM_R]}>
              <mesh geometry={geo.podClamp} material={mat.hinge} position={[-ox * 0.07, 0, -oz * 0.07]} rotation={[0, a, 0]} />
              <mesh geometry={geo.podBody} material={mat.pod} position={[0, 0.02, 0]} />
              <mesh geometry={geo.podCap} material={mat.pod} position={[0, -0.03, 0]} />
              <mesh geometry={geo.bell} material={mat.bell} position={[0, 0.09, 0]} />
              <mesh geometry={geo.bellRing} material={mat.sleeve} position={[0, 0.071, 0]} rotation={[Math.PI / 2, 0, 0]} />
              {/* nav lights: port red, starboard green, rear white strobes */}
              <mesh
                ref={(m) => {
                  if (m && !front && !strobes.current.includes(m)) strobes.current.push(m);
                }}
                geometry={geo.led}
                material={front ? (ox > 0 ? mat.ledRed : mat.ledGreen) : mat.ledWhite}
                position={[0, -0.1, 0]}
              />
            </group>

            {/* propeller */}
            <group ref={reg({ key: "props", dir: [ox * 0.4, 0.95, oz * 0.4] })} position={[ox * ARM_R, MOTOR_TOP, oz * ARM_R]}>
              <group
                ref={(g) => {
                  if (g) rotors.current[i] = g;
                }}
                rotation={[0, i * 0.9, 0]}
              >
                <mesh geometry={geo.hub} material={mat.pod} />
                <mesh geometry={geo.hubCap} material={mat.bell} position={[0, 0.02, 0]} />
                {[0, Math.PI].map((r) => (
                  <group key={r} rotation={[0, r, 0]} scale={[1, 1, SPIN_DIR[i]]}>
                    <mesh geometry={geo.blade} material={mat.prop} />
                    <mesh geometry={geo.tip} material={mat.propTip} position={[PROP_R - 0.06, 0.004, 0.004]} rotation={[0.1, 0, 0]} />
                  </group>
                ))}
              </group>
              <mesh geometry={geo.disc} material={mat.disc} position={[0, 0.004, 0]} renderOrder={2} />
            </group>
          </group>
        );
      })}

      {/* ---------- top cover (lifts with the flight controller) ---------- */}
      <group ref={reg({ key: "cover", dir: [0, 0.62, 0] })} position={[0, 0.098, 0]}>
        <mesh geometry={geo.cover} material={mat.cover} />
        {[-0.1, -0.13, -0.16, -0.19, -0.22].map((z) => (
          <mesh key={z} geometry={geo.vent} material={mat.panel} position={[0, 0.026, z]} />
        ))}
        <mesh
          ref={(m) => {
            if (m && !strobes.current.includes(m)) strobes.current.push(m);
          }}
          geometry={geo.led}
          material={mat.ledWhite}
          position={[0, 0.03, -0.3]}
        />
      </group>

      {/* ---------- flight controller ---------- */}
      <group ref={reg({ key: "fc", dir: [0, 0.34, 0] })} position={[0, 0.09, 0]}>
        <mesh geometry={geo.pcb} material={mat.pcb} />
        <mesh geometry={geo.chipL} material={mat.chip} position={[0, 0.01, 0.04]} />
        <mesh geometry={geo.chipS} material={mat.chip} position={[0.09, 0.009, 0.12]} />
        <mesh geometry={geo.chipS} material={mat.chip} position={[-0.09, 0.009, 0.12]} />
        <mesh geometry={geo.chipS} material={mat.chip} position={[0.08, 0.009, -0.08]} />
        <mesh geometry={geo.conn} material={mat.gold} position={[0, 0.01, -0.17]} />
      </group>

      {/* ---------- dual hot-swap batteries ---------- */}
      <group ref={reg({ key: "battery", dir: [0, 0.95, -0.1] })} position={[0, 0.16, -0.04]}>
        {[-0.065, 0.065].map((x) => (
          <group key={x} position={[x, 0, 0]}>
            <RoundedBox args={[0.1, 0.07, 0.4]} radius={0.016} smoothness={3} material={mat.battery} />
            <mesh geometry={geo.batteryLabel} material={mat.label} position={[0, 0.036, 0.06]} />
            <mesh geometry={geo.latch} material={mat.label} position={[0, 0.005, -0.21]} />
          </group>
        ))}
      </group>

      {/* ---------- dual GNSS antennas ---------- */}
      <group ref={reg({ key: "gps", dir: [0, 1.2, 0] })} position={[0, 0.12, 0.26]}>
        {[-0.14, 0.14].map((x) => (
          <group key={x} position={[x, 0, 0]}>
            <mesh geometry={geo.mast} material={mat.hinge} position={[0, 0.065, 0]} />
            <mesh geometry={geo.gnss} material={mat.cover} position={[0, 0.14, 0]} />
            <mesh geometry={geo.gnssTop} material={mat.label} position={[0, 0.152, 0]} />
          </group>
        ))}
      </group>

      {/* ---------- landing gear ---------- */}
      <group ref={reg({ key: "gear", dir: [0, -0.42, 0] })}>
        {geo.legs.map((g, i) => (
          <mesh key={i} geometry={g} material={i % 2 ? mat.hinge : mat.carbon} />
        ))}
        {[0.31, -0.31].map((x) => (
          <group key={x} position={[x, -0.52, 0.02]}>
            <mesh geometry={geo.skid} material={mat.carbon} />
            <mesh geometry={geo.skidCap} material={mat.rubber} position={[0, 0, 0.38]} />
            <mesh geometry={geo.skidCap} material={mat.rubber} position={[0, 0, -0.38]} />
          </group>
        ))}
      </group>

      {/* ---------- ball gimbal payload ---------- */}
      <group ref={reg({ key: "gimbal", dir: [0, -0.3, 0.45] })} position={[0, -0.13, 0.3]}>
        <mesh geometry={geo.damperPlate} material={mat.hinge} />
        {[
          [0.06, 0.045],
          [-0.06, 0.045],
          [0.06, -0.045],
          [-0.06, -0.045],
        ].map(([x, z]) => (
          <mesh key={`${x}${z}`} geometry={geo.damper} material={mat.rubber} position={[x, -0.016, z]} />
        ))}
        <mesh geometry={geo.yoke} material={mat.hinge} position={[0, -0.06, 0]} />
        <group ref={gimbal} position={[0, -0.13, 0]}>
          <mesh geometry={geo.ball} material={mat.payload} />
          <mesh geometry={geo.window} material={mat.sensor} position={[0.012, 0.004, 0.07]} />
          <mesh geometry={geo.windowSmall} material={mat.sensor} position={[-0.045, -0.02, 0.058]} />
        </group>
      </group>
    </group>
  );
}
