"use client";

import { Suspense, useMemo, useRef, type ComponentType, type RefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Environment, PerspectiveCamera } from "@react-three/drei";
import * as THREE from "three";
import { chapters } from "../../content";
import { reducedMotion, smootherstep } from "../../lib/stage";
import { newAircraftState, type AircraftState } from "../kit";
import { CameraQuad } from "../aircraft/CameraQuad";
import { RacingQuad } from "../aircraft/RacingQuad";
import { InspectionQuad } from "../aircraft/InspectionQuad";
import { Vtol } from "../aircraft/Vtol";
import { AgriHex } from "../aircraft/AgriHex";
import { isPortrait, stepOf, type ActProps } from "./common";
import { PhoenixDecal } from "./PhoenixDecal";

/*
  UAV: the one section the drones own. The whole fleet shares the stage; each
  step brings its aircraft to centre stage while the others hold a loose
  formation behind it. Scroll only moves setpoints. Every aircraft gets there
  through a cascaded controller, as the real thing does:
    setpoint -> position loop -> velocity loop -> commanded acceleration
    -> thrust vector -> attitude loop -> tilt -> acceleration.
  Multirotors bank into every move and flare to brake; gusts push them off
  station. The VTOL transitions to wing-borne flight: lift rotors park, the
  pusher spools, turns are banked.
*/

const N = chapters.uav.steps.length;
const G = 12; // gravity, scaled to scene units
const SUBSTEP = 1 / 180;
const Y = new THREE.Vector3(0, 1, 0);
const X = new THREE.Vector3(1, 0, 0);
const Z = new THREE.Vector3(0, 0, 1);
const wrapPi = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

type Dyn = { maxTiltDeg: number; kpPos: number; kpVel: number; vMax: number; attRate: number; yawRate: number; gust: number; yawToVelocity?: number };
type Pattern = "circle" | "eight" | "survey" | null;
type Craft = {
  id: string;
  Model: ComponentType<{ state: RefObject<AircraftState> }>;
  feature: number; // the step this aircraft headlines
  slot: number; // formation slot when not featured
  yaw: number;
  size: number; // apparent size when featured
  dyn: Dyn;
  vtol?: boolean;
  pattern?: Pattern;
  orbit?: [number, number, number, number]; // ax, ay, az, rad/s
  exhibit?: boolean;
  phoenix?: boolean; // easter egg: Team Phoenix decal on the top cover
};

const FLEET: Craft[] = [
  {
    id: "vtol", Model: Vtol, feature: 0, slot: 0, yaw: Math.PI / 2, size: 1.0, vtol: true, pattern: "circle", orbit: [1.7, 0.18, 1.3, 0.55],
    dyn: { maxTiltDeg: 24, kpPos: 2.4, kpVel: 3.4, vMax: 16, attRate: 10, yawRate: 1.8, gust: 0.7 },
  },
  {
    id: "agri", Model: AgriHex, feature: 1, slot: 1, yaw: -2.6, size: 1.25, phoenix: true,
    dyn: { maxTiltDeg: 20, kpPos: 1.7, kpVel: 2.6, vMax: 7, attRate: 8, yawRate: 0.9, gust: 0.75 },
  },
  {
    id: "inspection", Model: InspectionQuad, feature: 2, slot: 2, yaw: 0.5, size: 1.1, exhibit: true,
    dyn: { maxTiltDeg: 32, kpPos: 2.3, kpVel: 3.6, vMax: 11, attRate: 16, yawRate: 1.6, gust: 1.0 },
  },
  {
    id: "camera", Model: CameraQuad, feature: 3, slot: 3, yaw: -0.6, size: 1.35, pattern: "survey", orbit: [1.2, 0, 0.9, 0.5],
    dyn: { maxTiltDeg: 30, kpPos: 2.4, kpVel: 3.6, vMax: 10, attRate: 16, yawRate: 1.8, gust: 1 },
  },
  {
    id: "racer", Model: RacingQuad, feature: 4, slot: 4, yaw: 0.9, size: 1.25, pattern: "eight", orbit: [1.2, 0.3, 0.6, 0.8],
    dyn: { maxTiltDeg: 58, kpPos: 3.0, kpVel: 5.5, vMax: 16, attRate: 30, yawRate: 4, gust: 1.3, yawToVelocity: 0.85 },
  },
];

// Formation slots (screen NDC x, y and apparent size), behind and around centre stage.
const SLOTS_WIDE: [number, number, number][] = [
  [0.05, 0.5, 0.58], [0.4, 0.58, 0.52], [0.76, 0.5, 0.58], [0.9, 0.02, 0.5], [0.74, -0.6, 0.55],
];
const SLOTS_TALL: [number, number, number][] = [
  [-0.68, 0.84, 0.42], [-0.24, 0.9, 0.4], [0.22, 0.9, 0.4], [0.66, 0.84, 0.42], [0.72, -0.02, 0.4],
];
const STAGE_WIDE: [number, number] = [0.34, -0.05];
const STAGE_TALL: [number, number] = [0, 0.4];

const ENTRY_FROM = [-1.9, 1.9, -1.9, 1.9, 1.9];
const CAM_POS: [number, number, number] = [0, 3.2, 9];

function Aircraft({ craft, seed, stage }: { craft: Craft; seed: number; stage: RefObject<HTMLElement> }) {
  const group = useRef<THREE.Group>(null);
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const state = useRef<AircraftState>(newAircraftState());
  const reduce = useMemo(() => reducedMotion(), []);
  const aHMax = G * Math.tan(THREE.MathUtils.degToRad(craft.dyn.maxTiltDeg));

  const sim = useMemo(
    () => ({
      init: false, t: seed * 3.1,
      p: new THREE.Vector3(), v: new THREE.Vector3(), q: new THREE.Quaternion(), yaw: craft.yaw,
      cruise: 0, thrust: G, explode: 0, feat: 0, spool: 1,
      target: new THREE.Vector3(), vCmd: new THREE.Vector3(), aCmd: new THREE.Vector3(), thr: new THREE.Vector3(), up: new THREE.Vector3(),
      wind: new THREE.Vector3(), qTilt: new THREE.Quaternion(), qYaw: new THREE.Quaternion(), qGoal: new THREE.Quaternion(),
      qWing: new THREE.Quaternion(), qTmp: new THREE.Quaternion(), euler: new THREE.Euler(),
      ndc: new THREE.Vector3(), dir: new THREE.Vector3(), fwd: new THREE.Vector3(),
    }),
    [craft, seed],
  );

  /** Screen position (NDC) + apparent size -> world point at the matching depth. */
  const toWorld = (x: number, y: number, size: number, fit: number, out: THREE.Vector3) => {
    const dist = camera.position.length();
    const depth = Math.max(3, dist / Math.max(0.2, size * fit));
    sim.ndc.set(x, y, 0.5).unproject(camera);
    sim.dir.subVectors(sim.ndc, camera.position).normalize();
    camera.getWorldDirection(sim.fwd);
    return out.copy(camera.position).addScaledVector(sim.dir, depth / sim.dir.dot(sim.fwd));
  };

  useFrame((frame, delta) => {
    const dt = Math.min(delta, 0.1);
    const g = group.current!;
    const portrait = isPortrait(camera);
    const visH = 2 * camera.position.length() * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const visW = visH * camera.aspect;
    const fit = portrait ? visW / 3.6 : Math.min(1, visW / 9);

    // Where the chapter is: entering (stage rising into view), the active step, and its local progress.
    const section = stage.current?.parentElement ?? null;
    const rect = section?.getBoundingClientRect();
    const vh = window.innerHeight;
    const enter = rect ? smootherstep((vh - rect.top) / (vh * 0.9)) : 1;
    const s = stepOf(stage, N);
    const step = Math.floor(s);
    const local = s - step;
    const featured = step === craft.feature;
    sim.feat = THREE.MathUtils.damp(sim.feat, featured ? 1 : 0, 2.2, dt);

    // Setpoint: centre stage when featured, formation slot otherwise; fly in from the side on entry.
    const slots = portrait ? SLOTS_TALL : SLOTS_WIDE;
    const stageXY = portrait ? STAGE_TALL : STAGE_WIDE;
    const sl = slots[craft.slot];
    let x = featured ? stageXY[0] : sl[0];
    let y = featured ? stageXY[1] : sl[1];
    let size = featured ? craft.size * (portrait ? 0.62 : 1) : sl[2];
    x = THREE.MathUtils.lerp(ENTRY_FROM[craft.slot], x, enter);
    y = THREE.MathUtils.lerp(y + 0.3, y, enter);
    // Survey mission (plain-language step): climb out from low before flying the pattern.
    if (featured && craft.pattern === "survey") y -= (1 - smootherstep(local / 0.25)) * 0.55;
    toWorld(x, y, size, fit, sim.target);

    // Featured manoeuvres.
    const pat = featured && !reduce ? craft.pattern : null;
    const patW = pat === "circle" ? smootherstep((local - 0.3) / 0.25) : pat === "survey" ? smootherstep((local - 0.22) / 0.15) : pat ? 1 : 0;
    if (pat && craft.orbit && patW > 0) {
      const [ax, ay, az, w] = craft.orbit;
      const k = portrait ? 0.5 : 1;
      const tt = sim.t * w;
      if (pat === "circle") {
        sim.target.x += Math.sin(tt) * ax * k * patW;
        sim.target.y += Math.sin(tt * 0.5) * ay * patW;
        sim.target.z += Math.cos(tt) * az * k * patW;
      } else if (pat === "eight") {
        sim.target.x += Math.sin(tt) * ax * k;
        sim.target.y += Math.sin(tt * 2) * ay;
        sim.target.z += Math.sin(tt * 2 + 0.6) * az * k;
      } else {
        // Lawnmower survey: sweep legs across, stepping forward each leg.
        const leg = (tt * 0.35) % 4;
        const sweep = leg < 1 ? leg : leg < 2 ? 1 : leg < 3 ? 3 - leg : 0;
        const fwd = leg < 1 ? 0 : leg < 2 ? leg - 1 : leg < 3 ? 1 : 4 - leg;
        sim.target.x += (sweep * 2 - 1) * ax * k * patW;
        sim.target.z += (fwd * 2 - 1) * az * k * patW;
      }
    }

    // Exploded view (self-tuning flight controller step): hover, spool down, open up, board highlighted.
    const wantExplode = craft.exhibit && featured ? smootherstep((local - 0.12) / 0.3) * (1 - smootherstep((local - 0.85) / 0.15)) : 0;
    sim.explode = THREE.MathUtils.damp(sim.explode, wantExplode, 4, dt);
    const exhibit = THREE.MathUtils.smoothstep(sim.explode, 0.02, 0.3);

    if (!sim.init) {
      sim.p.copy(sim.target);
      sim.q.setFromAxisAngle(Y, craft.yaw);
      sim.init = true;
    }

    const d = craft.dyn;
    sim.spool = THREE.MathUtils.damp(sim.spool, exhibit > 0.5 ? 0.12 : 1, 2.2, dt);
    const gustAmp = reduce ? 0 : d.gust * (1 - exhibit) * (featured ? 1 : 0.6);
    const yawBase = craft.yaw + (featured && craft.exhibit ? sim.t * 0.25 : 0);

    let rem = dt;
    while (rem > 1e-6) {
      const h = Math.min(SUBSTEP, rem);
      rem -= h;
      sim.t += h;
      const hSpeed = Math.hypot(sim.v.x, sim.v.z);
      if (craft.vtol) sim.cruise = THREE.MathUtils.damp(sim.cruise, Math.max(patW * (featured ? 1 : 0), THREE.MathUtils.smoothstep(hSpeed, 1.2, 2.6)), 1.6, h);

      const followW = Math.max(craft.vtol ? sim.cruise : 0, (d.yawToVelocity ?? 0) * THREE.MathUtils.smoothstep(hSpeed, 0.4, 2));
      const pathYaw = Math.atan2(sim.v.x, sim.v.z);
      const yawGoal = followW > 0.01 ? yawBase + wrapPi(pathYaw - yawBase) * followW : yawBase;
      sim.yaw += THREE.MathUtils.clamp(wrapPi(yawGoal - sim.yaw) * 2.4, -d.yawRate, d.yawRate) * h;
      sim.qYaw.setFromAxisAngle(Y, sim.yaw);

      if (exhibit > 0.999) {
        sim.p.lerp(sim.target, 1 - Math.exp(-6 * h));
        sim.v.set(0, 0, 0);
        sim.qGoal.copy(sim.qYaw);
      } else {
        sim.vCmd.subVectors(sim.target, sim.p).multiplyScalar(d.kpPos);
        if (sim.vCmd.length() > d.vMax) sim.vCmd.setLength(d.vMax);
        sim.aCmd.subVectors(sim.vCmd, sim.v).multiplyScalar(d.kpVel);
        const ah = Math.hypot(sim.aCmd.x, sim.aCmd.z);
        const limit = craft.vtol ? THREE.MathUtils.lerp(aHMax, aHMax * 2.4, sim.cruise) : aHMax;
        if (ah > limit) {
          sim.aCmd.x *= limit / ah;
          sim.aCmd.z *= limit / ah;
        }
        sim.aCmd.y = THREE.MathUtils.clamp(sim.aCmd.y, -0.55 * G, 0.8 * G);
        sim.thr.set(sim.aCmd.x, sim.aCmd.y + G, sim.aCmd.z);
        sim.thrust = sim.thr.length();
        sim.up.copy(sim.thr).normalize();
        sim.qTilt.setFromUnitVectors(Y, sim.up);
        sim.qGoal.multiplyQuaternions(sim.qTilt, sim.qYaw);

        if (craft.vtol && sim.cruise > 0.01) {
          const fx = Math.sin(sim.yaw), fz = Math.cos(sim.yaw);
          const lat = sim.aCmd.x * fz - sim.aCmd.z * fx;
          const bank = THREE.MathUtils.clamp(Math.atan2(lat, G), -0.42, 0.42);
          const climb = THREE.MathUtils.clamp(Math.atan2(sim.v.y, Math.max(hSpeed, 0.5)), -0.3, 0.3);
          sim.qWing.copy(sim.qYaw).multiply(sim.qTmp.setFromAxisAngle(X, -climb)).multiply(sim.qTmp.setFromAxisAngle(Z, -bank));
          sim.qGoal.slerp(sim.qWing, sim.cruise);
        }
      }
      if (exhibit > 0) sim.qGoal.premultiply(sim.qTmp.setFromAxisAngle(X, 0.42 * exhibit));
      sim.q.slerp(sim.qGoal, 1 - Math.exp(-d.attRate * h));

      if (exhibit < 0.999) {
        const u = sim.t + seed * 17.3;
        sim.wind
          .set(
            0.55 * Math.sin(u * 0.73) + 0.35 * Math.sin(u * 1.91 + 1.3) + 0.18 * Math.sin(u * 4.7 + 0.4),
            0.22 * Math.sin(u * 0.53 + 2) + 0.12 * Math.sin(u * 2.3),
            0.4 * Math.sin(u * 0.61 + 0.7) + 0.18 * Math.sin(u * 3.1 + 2.2),
          )
          .multiplyScalar(gustAmp);
        if (craft.vtol && sim.cruise > 0.5) sim.v.addScaledVector(sim.aCmd, h).addScaledVector(sim.wind, h * 0.4);
        else {
          sim.up.copy(Y).applyQuaternion(sim.q);
          const lift = sim.thrust * Math.min(1, sim.spool / 0.85);
          sim.v.x += (sim.up.x * lift + sim.wind.x) * h;
          sim.v.y += (sim.up.y * lift - G + sim.wind.y) * h;
          sim.v.z += (sim.up.z * lift + sim.wind.z) * h;
        }
        sim.v.multiplyScalar(1 - 0.25 * h);
        sim.p.addScaledVector(sim.v, h);
      }
    }

    g.position.copy(sim.p);
    g.quaternion.copy(sim.q);

    const st = state.current;
    st.t = frame.clock.elapsedTime;
    st.explode = sim.explode;
    st.active = craft.exhibit && sim.explode > 0.4 ? "fc" : null;
    st.cruise = craft.vtol ? sim.cruise : 0;
    st.lift = sim.spool * (craft.vtol ? 1 - sim.cruise : 1) * (exhibit > 0.5 ? 1 : 0.9 + 0.1 * Math.sqrt(sim.thrust / G));
    sim.euler.setFromQuaternion(sim.q, "YXZ");
    st.gimbalPitch = -sim.euler.x + (featured && craft.pattern === "survey" ? 1.0 : 0.25);
  });

  const Model = craft.Model;
  return (
    <group ref={group}>
      <Model state={state} />
      {craft.phoenix && (
        <Suspense fallback={null}>
          <PhoenixDecal width={0.21} position={[0, 0.247, 0.13]} rotation={[-Math.PI / 2, 0, Math.PI]} />
        </Suspense>
      )}
    </group>
  );
}

export function FleetAct({ stage }: ActProps) {
  return (
    <>
      {/* Elevated chase-cam view looking at the origin; aim set up front so every aircraft
          projects its screen setpoint through the final camera from the first frame */}
      <PerspectiveCamera makeDefault fov={35} near={0.1} far={50} position={CAM_POS} rotation={[-Math.atan2(CAM_POS[1], CAM_POS[2]), 0, 0]} />
      <Environment files="/hdri/studio_small_09_1k.hdr" environmentIntensity={0.9} />
      <ambientLight intensity={0.25} />
      <directionalLight position={[4, 6, 5]} intensity={1.6} />
      <directionalLight position={[-5, 2, -4]} intensity={0.8} color="#ffd9a0" />
      {FLEET.map((c, i) => (
        <Aircraft key={c.id} craft={c} seed={i} stage={stage} />
      ))}
    </>
  );
}
