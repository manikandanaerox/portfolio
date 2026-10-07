"use client";

import { useEffect, useMemo, useRef, type ComponentType } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { anatomy } from "../content";
import { layout, reducedMotion } from "../lib/layout";
import { type AircraftState, newAircraftState } from "./kit";
import { fleetScreen } from "../lib/fleetScreen";
import { heroFrame, pointerTrack, trackPointer } from "../lib/heroFrame";

/*
  Generic flight model shared by the whole fleet.

  Scroll only sets a waypoint. Each aircraft gets there the way the real
  thing does, through a cascaded controller:
    waypoint -> position loop -> velocity loop -> commanded acceleration
    -> thrust vector -> attitude loop -> body tilt -> actual acceleration.
  A multirotor can only accelerate sideways by tilting, so it banks into
  every move and flares to brake. Gusts push it off station and the loops
  correct. Per-airframe dynamics make the racer twitchy and the sprayer heavy.

  VTOL: above transition speed the wing takes the load, lift rotors park,
  the pusher spools up, the nose follows the flight path and turns are banked.
*/

// ---------- waypoints & stations ----------

/** x/y: fractions of the half-viewport; s: apparent size (converted to depth). */
export type Waypoint = { x: number; y: number; s: number; yaw: number; explode: number; look: number; orbit: number; patrol: number };
export const W = (x: number, y: number, s: number, yaw: number, o: Partial<Pick<Waypoint, "explode" | "look" | "orbit" | "patrol">> = {}): Waypoint => ({
  x, y, s, yaw, explode: o.explode ?? 0, look: o.look ?? 0, orbit: o.orbit ?? 0, patrol: o.patrol ?? 0,
});

export const STATIONS = ["hero", "about", "anatomy", "capabilities", "gap", "journey", "contact"] as const;
export type Station = (typeof STATIONS)[number];
type Home = Waypoint | [Waypoint, Waypoint]; // [at station start, at station end]

export type Dynamics = {
  maxTiltDeg: number;
  kpPos: number; // position error -> velocity setpoint
  kpVel: number; // velocity error -> acceleration setpoint
  vMax: number;
  attRate: number; // attitude loop bandwidth
  yawRate: number; // rad/s
  gust: number;
  yawToVelocity?: number; // 0..1: point the nose along the flight path
};

export type AircraftConfig = {
  id: string;
  Model: ComponentType<{ state: React.RefObject<AircraftState> }>;
  home: Partial<Record<Station, Home>>;
  mobileHome?: Partial<Record<Station, Home>>;
  before: Waypoint; // where it waits before its first station
  after: Waypoint; // where it leaves to after its last station
  dyn: Dynamics;
  vtol?: boolean;
  landing?: { gearDrop: number }; // lands at its contact station
  exhibit?: boolean; // exploded view in the anatomy station
  orbit?: [number, number, number, number]; // ax, ay, az (world units), angular rate
  orbitShape?: "eight" | "circle"; // racer carves figure-eights; VTOL loiters in a circle
  /** Cursor tracking outside follow-me: the station leans toward the pointer, up to this NDC radius. */
  track?: number;
  /**
   * Follow-me (hero): while the station's `patrol` weight is on, the aircraft follows
   * the mouse pointer, hovering just above it; with no pointer activity it drifts
   * between `idle` spots. It never enters the portrait frame (heroFrame): its setpoint
   * routes around the frame and is pushed out of it. Nose and gimbal stay on `subject`.
   */
  follow?: {
    depth: number; // apparent size while following
    idle: [number, number][]; // screen-space (NDC) idle spots
    subject: [number, number, number];
    aboveCursor: number; // NDC offset so the drone hovers above the pointer, not on it
    speed: number; // setpoint speed when following (NDC/s)
    accel: number;
    idleSpeed: number;
    idleAccel: number;
    dwell: [number, number];
    dyn: Partial<Dynamics>;
  };
};

function stationRanges() {
  const s = layout.sections;
  const vh = layout.vh;
  const top = (id: keyof typeof s) => s[id]?.top ?? 0;
  const end = (id: keyof typeof s) => (s[id] ? s[id]!.top + s[id]!.height - vh : 0);
  const contact = Math.min(top("contact"), layout.maxScroll);
  return {
    hero: [0, Math.max(vh * 0.12, top("about") - vh)],
    about: [top("about"), end("about")],
    anatomy: [top("anatomy"), end("anatomy")],
    capabilities: [top("capabilities") - vh * 0.55, end("capabilities")],
    gap: [end("capabilities") + vh * 0.45, top("journey") - vh * 1.45],
    journey: [top("journey") - vh * 0.6, end("journey")],
    contact: [contact, contact],
  } as Record<Station, [number, number]>;
}

type Key = { y: number; wp: Waypoint };

function buildKeys(cfg: AircraftConfig, mobile: boolean): Key[] {
  const home = mobile ? cfg.mobileHome ?? {} : cfg.home;
  const ranges = stationRanges();
  const idx = STATIONS.map((st, i) => (home[st] ? i : -1)).filter((i) => i >= 0);
  const first = idx.length ? idx[0] : Infinity;
  const last = idx.length ? idx[idx.length - 1] : -Infinity;
  const keys: Key[] = [];
  STATIONS.forEach((st, i) => {
    const h = home[st];
    const [a, b] = ranges[st];
    const pair: [Waypoint, Waypoint] = h ? (Array.isArray(h) ? h : [h, h]) : i < first ? [cfg.before, cfg.before] : i > last ? [cfg.after, cfg.after] : [cfg.after, cfg.after];
    keys.push({ y: a, wp: pair[0] }, { y: Math.max(a, b), wp: pair[1] });
  });
  for (let i = 1; i < keys.length; i++) keys[i].y = Math.max(keys[i].y, keys[i - 1].y + 1);
  return keys;
}

const FIELDS = ["x", "y", "s", "yaw", "explode", "look", "orbit", "patrol"] as const;

function sample(keys: Key[], sy: number, out: Waypoint) {
  let i = 0;
  while (i < keys.length - 2 && sy > keys[i + 1].y) i++;
  const a = keys[i];
  const b = keys[i + 1];
  const t = THREE.MathUtils.smootherstep(sy, a.y, b.y);
  for (const f of FIELDS) out[f] = a.wp[f] + (b.wp[f] - a.wp[f]) * t;
}

// ---------- render-on-demand bookkeeping ----------

/** Aircraft ids that need frames right now (visible, or still flying to their waypoint). */
export const fleetActivity = new Set<string>();

// ---------- constants ----------

const G = 12; // gravity, scaled so tilt angles read correctly at scene speeds
const SUBSTEP = 1 / 180;
const Y_AXIS = new THREE.Vector3(0, 1, 0);
const X_AXIS = new THREE.Vector3(1, 0, 0);
const Z_AXIS = new THREE.Vector3(0, 0, 1);
const wrapPi = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

/** Smooth, non-repeating gust field (sum of incommensurate sines), offset per aircraft. */
function gust(t: number, seed: number, out: THREE.Vector3) {
  const u = t + seed * 17.3;
  return out.set(
    0.55 * Math.sin(u * 0.73) + 0.35 * Math.sin(u * 1.91 + 1.3) + 0.18 * Math.sin(u * 4.7 + 0.4),
    0.22 * Math.sin(u * 0.53 + 2) + 0.12 * Math.sin(u * 2.3),
    0.4 * Math.sin(u * 0.61 + 0.7) + 0.18 * Math.sin(u * 3.1 + 2.2),
  );
}

// ---------- follow-me geometry (screen / NDC space) ----------

const TOP_SAFE = 0.7; // NDC: keep follow-me routes ~15% of the viewport below the top (dock)

type Rect = { l: number; r: number; t: number; b: number }; // NDC, t > b

const inside = (x: number, y: number, e: Rect) => x > e.l && x < e.r && y < e.t && y > e.b;

/** Push a point inside the rect out to the nearest edge (slides along it). */
function pushOut(v: THREE.Vector2, e: Rect | null) {
  if (!e || !inside(v.x, v.y, e)) return;
  const dl = v.x - e.l, dr = e.r - v.x;
  const dt = e.t > TOP_SAFE ? Infinity : e.t - v.y; // top edge too close to the dock: not allowed
  const db = e.b < -0.9 ? Infinity : (v.y - e.b) * 3; // prefer the sides: below the frame is the headline
  const m = Math.min(dl, dr, dt, db);
  if (m === dl) v.x = e.l;
  else if (m === dr) v.x = e.r;
  else if (m === dt) v.y = e.t;
  else v.y = e.b;
}

/** Does the segment a->b pass through the rect's interior? (Liang-Barsky, slightly shrunk rect.) */
function crosses(a: THREE.Vector2, b: THREE.Vector2, e: Rect) {
  const k = 1e-3;
  const box = { l: e.l + k, r: e.r - k, b: e.b + k, t: e.t - k };
  let t0 = 0, t1 = 1;
  const dx = b.x - a.x, dy = b.y - a.y;
  const clip = (p: number, q: number) => {
    if (Math.abs(p) < 1e-9) return q >= 0;
    const r = q / p;
    if (p < 0) { if (r > t1) return false; if (r > t0) t0 = r; }
    else { if (r < t0) return false; if (r < t1) t1 = r; }
    return true;
  };
  return clip(-dx, a.x - box.l) && clip(dx, box.r - a.x) && clip(-dy, a.y - box.b) && clip(dy, box.t - a.y) && t0 < t1;
}

// ---------- aircraft ----------

export function Aircraft({ cfg, seed }: { cfg: AircraftConfig; seed: number }) {
  const group = useRef<THREE.Group>(null);
  const pad = useRef<THREE.Group>(null);
  const padMat = useRef<THREE.MeshBasicMaterial>(null);
  const viewport = useThree((s) => s.viewport);
  const camera = useThree((s) => s.camera);
  const state = useRef<AircraftState>(newAircraftState());
  const reduce = useMemo(() => reducedMotion(), []);
  const cache = useRef({ version: -1, mobile: false, keys: [] as Key[], landY: Infinity });
  const wp = useMemo(() => W(0, 0, 1, 0), []);
  const landWp = useMemo(() => {
    const h = cfg.home.contact;
    return h ? (Array.isArray(h) ? h[1] : h) : null;
  }, [cfg]);

  const followDyn = useMemo(() => ({ ...cfg.dyn, ...(cfg.follow?.dyn ?? {}) }), [cfg]);
  useEffect(() => {
    if (cfg.follow || cfg.track) trackPointer();
  }, [cfg]);

  const sim = useMemo(
    () => ({
      init: false,
      p: new THREE.Vector3(),
      v: new THREE.Vector3(),
      q: new THREE.Quaternion(),
      yaw: 0,
      spool: 1,
      cruise: 0,
      thrust: G,
      landed: false,
      explode: 0,
      t: 0,
      target: new THREE.Vector3(),
      landAt: new THREE.Vector3(),
      vCmd: new THREE.Vector3(),
      aCmd: new THREE.Vector3(),
      thr: new THREE.Vector3(),
      up: new THREE.Vector3(),
      wind: new THREE.Vector3(),
      qTilt: new THREE.Quaternion(),
      qYaw: new THREE.Quaternion(),
      qGoal: new THREE.Quaternion(),
      qWing: new THREE.Quaternion(),
      qTmp: new THREE.Quaternion(),
      euler: new THREE.Euler(),
      // survey
      idleIdx: 0,
      pDwell: 0,
      pSeed: 0.37,
      c2: new THREE.Vector2(), // screen-space setpoint (NDC)
      c2v: 0,
      goal: new THREE.Vector2(),
      hop: new THREE.Vector2(),
      v2: new THREE.Vector2(),
      carrotLive: false,
      lean: new THREE.Vector2(), // smoothed cursor offset (NDC)
      subject: new THREE.Vector3(),
      pTarget: new THREE.Vector3(),
    }),
    [],
  );

  const scratch = useMemo(() => ({ ndc: new THREE.Vector3(), dir: new THREE.Vector3(), fwd: new THREE.Vector3() }), []);

  /**
   * Waypoint -> world. x/y are the screen position (NDC); s sets distance along
   * the view axis (s = 1 at the focus distance). Exact for the tilted camera,
   * so aircraft land where the layout expects them at any depth.
   */
  const toWorld = (w: Waypoint, fit: number, out: THREE.Vector3) => {
    const dist = camera.position.length();
    const depth = Math.max(3, dist / Math.max(0.2, w.s * fit));
    scratch.ndc.set(w.x, w.y, 0.5).unproject(camera);
    scratch.dir.subVectors(scratch.ndc, camera.position).normalize();
    camera.getWorldDirection(scratch.fwd);
    return out.copy(camera.position).addScaledVector(scratch.dir, depth / scratch.dir.dot(scratch.fwd));
  };

  const isOnScreen = (p: THREE.Vector3) => {
    scratch.ndc.copy(p).project(camera);
    return scratch.ndc.z < 1 && Math.abs(scratch.ndc.x) < 1.6 && Math.abs(scratch.ndc.y) < 1.7;
  };

  useFrame((frame, delta) => {
    const dt = Math.min(delta, 0.1); // substepped below, so long frames stay accurate
    const mobile = viewport.aspect < 0.85;
    const fit = mobile ? viewport.width / 3.6 : Math.min(1, viewport.width / 9);
    if (cache.current.version !== layout.version || cache.current.mobile !== mobile) {
      const keys = buildKeys(cfg, mobile);
      cache.current = { version: layout.version, mobile, keys, landY: stationRanges().contact[0] };
    }
    const sy = window.scrollY;
    sample(cache.current.keys, sy, wp);

    // Cursor tracking: lean the station toward the pointer, bounded so the aircraft
    // stays in its own part of the layout. Off on the exploded bench and when idle.
    if (cfg.track && !mobile && !reduce) {
      const live = pointerTrack.fine && performance.now() - pointerTrack.t < 3500;
      let ox = 0, oy = 0;
      const onStage = Math.abs(wp.x) < 1 && Math.abs(wp.y) < 1; // never pull a parked aircraft into view
      if (live && onStage && wp.explode < 0.05 && wp.patrol < 0.5) {
        ox = (pointerTrack.x / window.innerWidth) * 2 - 1 - wp.x;
        oy = 1 - (pointerTrack.y / window.innerHeight) * 2 + 0.12 - wp.y;
        const len = Math.hypot(ox, oy);
        if (len > cfg.track) {
          ox *= cfg.track / len;
          oy *= cfg.track / len;
        }
      }
      sim.lean.x = THREE.MathUtils.damp(sim.lean.x, ox, 1.8, dt);
      sim.lean.y = THREE.MathUtils.damp(sim.lean.y, oy, 1.8, dt);
      wp.x += sim.lean.x;
      wp.y += sim.lean.y;
      if (onStage) wp.y = Math.min(0.86, wp.y); // stay clear of the dock
    }
    toWorld(wp, fit, sim.target);

    // Landing commitment: 1 once the page reaches the contact station.
    const canLand = !!cfg.landing && !!landWp && !mobile;
    const landW = canLand ? THREE.MathUtils.clamp(1 - Math.max(0, cache.current.landY - sy) / (layout.vh * 0.6), 0, 1) : 0;
    const wantLanded = landW > 0.97;
    if (canLand) {
      toWorld(landWp!, fit, sim.landAt);
      // Arrive above the pad, then descend; the setpoint goes below the pad so contact is detected.
      if (landW > 0) sim.target.y += wantLanded ? -0.25 : (1 - landW) * 0.9;
    }

    // Racer: never parked, it carves lines around its station.
    if (cfg.orbit && wp.orbit > 0 && !reduce) {
      const [ax, ay, az, w] = cfg.orbit;
      const t = sim.t * w;
      if (cfg.orbitShape === "circle") {
        sim.target.x += Math.sin(t) * ax * wp.orbit;
        sim.target.y += Math.sin(t * 0.5) * ay * wp.orbit;
        sim.target.z += Math.cos(t) * az * wp.orbit;
      } else {
        sim.target.x += Math.sin(t) * ax * wp.orbit;
        sim.target.y += Math.sin(t * 2) * ay * wp.orbit;
        sim.target.z += Math.sin(t * 2 + 0.6) * az * wp.orbit;
      }
    }

    // Follow-me: the controller tracks a screen-space setpoint that glides toward
    // the pointer (or an idle spot) with a trapezoidal speed profile, routes around
    // the portrait frame and is never allowed inside it.
    const followOn = !!cfg.follow && wp.patrol > 0.5 && !mobile;
    const d = followOn ? followDyn : cfg.dyn;
    const aHMax = G * Math.tan(THREE.MathUtils.degToRad(d.maxTiltDeg));
    if (followOn) {
      const f = cfg.follow!;
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      // Keep-out rect around the frame, padded by the drone's on-screen size.
      let ex: Rect | null = null;
      const el = heroFrame.el;
      if (el) {
        const rc = el.getBoundingClientRect();
        const rPx = fleetScreen.get(cfg.id)?.r ?? 90;
        const padX = rPx * 0.95 + 20;
        const padY = rPx * 0.35 + 16;
        ex = { l: ((rc.left - padX) / vw) * 2 - 1, r: ((rc.right + padX) / vw) * 2 - 1, t: 1 - ((rc.top - padY) / vh) * 2, b: 1 - ((rc.bottom + padY) / vh) * 2 };
      }

      // (Re)entering the hero: start the setpoint where the scroll schedule already has
      // the aircraft, so scrolling back up flies it straight home.
      if (!sim.carrotLive) {
        scratch.ndc.copy(sim.target).project(camera);
        sim.c2.set(scratch.ndc.x, scratch.ndc.y);
        sim.c2v = 0;
        sim.carrotLive = true;
      }

      const following = pointerTrack.fine && performance.now() - pointerTrack.t < 3500;
      if (following) {
        sim.goal.set((pointerTrack.x / vw) * 2 - 1, 1 - (pointerTrack.y / vh) * 2 + f.aboveCursor);
      } else {
        const [ix, iy] = f.idle[sim.idleIdx];
        sim.goal.set(ix, iy);
        if (sim.c2.distanceTo(sim.goal) < 0.01) {
          sim.pDwell -= dt;
          if (sim.pDwell <= 0) {
            sim.idleIdx = (sim.idleIdx + 1) % f.idle.length;
            sim.pSeed = (sim.pSeed * 9301 + 49297) % 233280;
            sim.pDwell = f.dwell[0] + (f.dwell[1] - f.dwell[0]) * (sim.pSeed / 233280);
          }
        }
      }
      sim.goal.set(THREE.MathUtils.clamp(sim.goal.x, -0.9, 0.9), THREE.MathUtils.clamp(sim.goal.y, -0.82, TOP_SAFE));
      pushOut(sim.goal, ex);

      // Route around the frame: shortest path over the frame's (slightly expanded)
      // corners, re-planned every frame from the current setpoint. Stateless, so it
      // cannot flip-flop; corners above the safe band (dock) are never used.
      sim.hop.copy(sim.goal);
      if (ex && crosses(sim.c2, sim.goal, ex)) {
        const m = 0.015;
        const corners = [
          new THREE.Vector2(ex.l - m, ex.t + m), new THREE.Vector2(ex.r + m, ex.t + m),
          new THREE.Vector2(ex.l - m, ex.b - m), new THREE.Vector2(ex.r + m, ex.b - m),
        ].filter((c) => c.y < TOP_SAFE && c.y > -0.9);
        const tail = (c: THREE.Vector2) => {
          if (!crosses(c, sim.goal, ex!)) return c.distanceTo(sim.goal);
          let best = Infinity;
          for (const c2 of corners) if (c2 !== c && !crosses(c, c2, ex!) && !crosses(c2, sim.goal, ex!)) best = Math.min(best, c.distanceTo(c2) + c2.distanceTo(sim.goal));
          return best;
        };
        let best = Infinity;
        for (const c of corners) {
          if (c.distanceTo(sim.c2) < 0.02 || crosses(sim.c2, c, ex)) continue;
          const cost = sim.c2.distanceTo(c) + tail(c);
          if (cost < best) {
            best = cost;
            sim.hop.copy(c);
          }
        }
      }

      const spd = following ? f.speed : f.idleSpeed;
      const acc = following ? f.accel : f.idleAccel;
      const toGo = sim.c2.distanceTo(sim.hop);
      const remaining = toGo + sim.hop.distanceTo(sim.goal);
      const want = Math.min(spd, Math.sqrt(2 * acc * remaining));
      sim.c2v = want > sim.c2v ? Math.min(want, sim.c2v + acc * dt) : want;
      if (toGo > 1e-5) sim.c2.addScaledVector(sim.v2.subVectors(sim.hop, sim.c2).normalize(), Math.min(toGo, sim.c2v * dt));
      pushOut(sim.c2, ex);

      toWorld(W(sim.c2.x, sim.c2.y, f.depth, 0), fit, sim.pTarget);
      toWorld(W(f.subject[0], f.subject[1], f.subject[2], 0), fit, sim.subject);
      sim.target.lerp(sim.pTarget, THREE.MathUtils.clamp((wp.patrol - 0.5) * 2, 0, 1));
    } else sim.carrotLive = false;

    // Parked out of frame and settled: no physics, no frames requested.
    // (Checked after every target update, so a parked aircraft wakes when its target returns.)
    const g = group.current!;
    const settled = sim.init && sim.p.distanceToSquared(sim.target) < 1e-3 && sim.v.lengthSq() < 1e-4;
    if (sim.init && settled && !g.visible && !isOnScreen(sim.target)) {
      fleetActivity.delete(cfg.id);
      fleetScreen.delete(cfg.id);
      return;
    }

    sim.explode = THREE.MathUtils.damp(sim.explode, cfg.exhibit ? wp.explode : 0, 5, dt);
    const exhibit = THREE.MathUtils.smoothstep(sim.explode, 0.02, 0.3);

    if (!sim.init) {
      sim.p.copy(sim.target);
      sim.yaw = wp.yaw;
      sim.q.setFromAxisAngle(Y_AXIS, wp.yaw);
      sim.init = true;
    }

    // Motors: idle on the pad, spool up before takeoff, slow on the bench.
    if (sim.landed && !wantLanded && sim.spool > 0.92) sim.landed = false;
    const spoolTarget = sim.landed ? (wantLanded ? 0 : 1) : exhibit > 0.5 ? 0.12 : 1;
    sim.spool = THREE.MathUtils.damp(sim.spool, spoolTarget, sim.landed && wantLanded ? 1.1 : 2.2, dt);

    const gustAmp = reduce ? 0 : d.gust * (1 - exhibit) * (1 - 0.75 * landW);

    let remaining = dt;
    while (remaining > 1e-6) {
      const h = Math.min(SUBSTEP, remaining);
      remaining -= h;
      sim.t += h;

      const hSpeed = Math.hypot(sim.v.x, sim.v.z);
      // VTOL transition: wing-borne above ~2 units/s.
      if (cfg.vtol) sim.cruise = THREE.MathUtils.damp(sim.cruise, Math.max(wp.orbit, THREE.MathUtils.smoothstep(hSpeed, 1.2, 2.6)), 1.6, h);

      // Heading: station yaw, or along the flight path for the racer / VTOL in cruise.
      const followW = Math.max(cfg.vtol ? sim.cruise : 0, (d.yawToVelocity ?? 0) * THREE.MathUtils.smoothstep(hSpeed, 0.4, 2));
      const pathYaw = Math.atan2(sim.v.x, sim.v.z);
      let yawGoal = followW > 0.01 ? wp.yaw + wrapPi(pathYaw - wp.yaw) * followW : wp.yaw;
      if (followOn) yawGoal = Math.atan2(sim.subject.x - sim.p.x, sim.subject.z - sim.p.z);
      sim.yaw += THREE.MathUtils.clamp(wrapPi(yawGoal - sim.yaw) * 2.4, -d.yawRate, d.yawRate) * h;
      sim.qYaw.setFromAxisAngle(Y_AXIS, sim.yaw);

      if (sim.landed || exhibit > 0.999) {
        if (sim.landed) sim.p.lerp(sim.landAt, 1 - Math.exp(-8 * h));
        else sim.p.lerp(sim.target, 1 - Math.exp(-6 * h));
        sim.v.set(0, 0, 0);
        sim.thrust = G;
        sim.qGoal.copy(sim.qYaw);
      } else {
        sim.vCmd.subVectors(sim.target, sim.p).multiplyScalar(d.kpPos);
        if (sim.vCmd.length() > d.vMax) sim.vCmd.setLength(d.vMax);
        sim.aCmd.subVectors(sim.vCmd, sim.v).multiplyScalar(d.kpVel);
        const ah = Math.hypot(sim.aCmd.x, sim.aCmd.z);
        const limit = cfg.vtol ? THREE.MathUtils.lerp(aHMax, aHMax * 2.4, sim.cruise) : aHMax;
        if (ah > limit) {
          sim.aCmd.x *= limit / ah;
          sim.aCmd.z *= limit / ah;
        }
        sim.aCmd.y = THREE.MathUtils.clamp(sim.aCmd.y, -0.55 * G, 0.8 * G);

        sim.thr.set(sim.aCmd.x, sim.aCmd.y + G, sim.aCmd.z);
        sim.thrust = sim.thr.length();
        sim.up.copy(sim.thr).normalize();
        sim.qTilt.setFromUnitVectors(Y_AXIS, sim.up);
        sim.qGoal.multiplyQuaternions(sim.qTilt, sim.qYaw);

        if (cfg.vtol && sim.cruise > 0.01) {
          // Wing-borne: bank into turns (lateral accel), nose follows climb.
          const fx = Math.sin(sim.yaw);
          const fz = Math.cos(sim.yaw);
          const lat = sim.aCmd.x * fz - sim.aCmd.z * fx;
          const bank = THREE.MathUtils.clamp(Math.atan2(lat, G), -0.42, 0.42); // ~24°, a sane mapping-VTOL turn
          const climb = THREE.MathUtils.clamp(Math.atan2(sim.v.y, Math.max(hSpeed, 0.5)), -0.3, 0.3);
          sim.qWing.copy(sim.qYaw);
          sim.qWing.multiply(sim.qTmp.setFromAxisAngle(X_AXIS, -climb));
          sim.qWing.multiply(sim.qTmp.setFromAxisAngle(Z_AXIS, -bank));
          sim.qGoal.slerp(sim.qWing, sim.cruise);
        }
      }

      if (exhibit > 0) {
        sim.qTmp.setFromAxisAngle(X_AXIS, 0.42 * exhibit);
        sim.qGoal.premultiply(sim.qTmp);
      }

      sim.q.slerp(sim.qGoal, 1 - Math.exp(-d.attRate * h));

      if (!sim.landed && exhibit < 0.999) {
        gust(sim.t, seed, sim.wind).multiplyScalar(gustAmp);
        if (cfg.vtol && sim.cruise > 0.5) {
          // In cruise the wing and pusher carry it: follow the commanded acceleration directly.
          sim.v.addScaledVector(sim.aCmd, h).addScaledVector(sim.wind, h * 0.4);
        } else {
          sim.up.copy(Y_AXIS).applyQuaternion(sim.q);
          const lift = sim.thrust * Math.min(1, sim.spool / 0.85);
          sim.v.x += (sim.up.x * lift + sim.wind.x) * h;
          sim.v.y += (sim.up.y * lift - G + sim.wind.y) * h;
          sim.v.z += (sim.up.z * lift + sim.wind.z) * h;
        }
        sim.v.multiplyScalar(1 - 0.25 * h);
        sim.p.addScaledVector(sim.v, h);

        if (canLand && landW > 0.5 && sim.p.y < sim.landAt.y) {
          sim.p.y = sim.landAt.y;
          if (sim.v.y < 0) sim.v.y = 0;
        }
        const off = Math.hypot(sim.p.x - sim.landAt.x, sim.p.z - sim.landAt.z);
        if (canLand && wantLanded && sim.p.y <= sim.landAt.y + 1e-3 && off < 0.3 && Math.abs(sim.v.y) < 0.4) sim.landed = true;
      }
    }

    g.position.copy(sim.p);
    g.quaternion.copy(sim.q);

    // Skip drawing aircraft outside the frame (with margin for wingspan).
    g.visible = isOnScreen(sim.p);
    // Request frames while visible and moving; a landed, spooled-down aircraft is static.
    const idleOnPad = sim.landed && sim.spool < 0.02;
    if ((g.visible && !idleOnPad) || !settled) fleetActivity.add(cfg.id);
    else fleetActivity.delete(cfg.id);

    if (pad.current && padMat.current) {
      pad.current.visible = landW > 0.01;
      pad.current.position.set(sim.landAt.x, sim.landAt.y - (cfg.landing?.gearDrop ?? 0.5), sim.landAt.z);
      padMat.current.opacity = landW * 0.5;
    }

    const st = state.current;
    st.t = frame.clock.elapsedTime;
    st.explode = sim.explode;
    st.cruise = cfg.vtol ? sim.cruise : 0;
    st.lift = sim.spool * (cfg.vtol ? 1 - sim.cruise : 1) * (exhibit > 0.5 ? 1 : 0.9 + 0.1 * Math.sqrt(sim.thrust / G));
    const an = layout.sections.anatomy;
    if (cfg.exhibit && an && sim.explode > 0.55) {
      const pr = THREE.MathUtils.clamp((sy - an.top) / Math.max(1, an.height - layout.vh), 0, 0.999);
      st.active = anatomy[Math.floor(pr * anatomy.length)].key;
    } else st.active = null;
    // Stabilised gimbal: cancels body pitch, aims at the station's subject, follows the pointer slightly.
    sim.euler.setFromQuaternion(sim.q, "YXZ");
    let look = wp.look;
    if (followOn) {
      const dh = Math.hypot(sim.subject.x - sim.p.x, sim.subject.z - sim.p.z);
      look = THREE.MathUtils.clamp(Math.atan2(sim.p.y - sim.subject.y, Math.max(dh, 0.3)), -0.5, 1.2);
    }
    st.gimbalPitch = -sim.euler.x + look + (reduce ? 0 : -frame.pointer.y * 0.15);

    // Publish screen position + rotor power for DOM effects (downwash on text).
    if (g.visible && !cfg.vtol) {
      const w = window.innerWidth;
      const hgt = window.innerHeight;
      scratch.ndc.copy(sim.p).project(camera);
      const sx = ((scratch.ndc.x + 1) / 2) * w;
      const sy2 = ((1 - scratch.ndc.y) / 2) * hgt;
      scratch.dir.setFromMatrixColumn(camera.matrixWorld, 0).multiplyScalar(1.6).add(sim.p).project(camera);
      const r = Math.abs(((scratch.dir.x - scratch.ndc.x) / 2) * w);
      fleetScreen.set(cfg.id, { x: sx, y: sy2, r, power: st.lift });
    } else fleetScreen.delete(cfg.id);
  });

  const Model = cfg.Model;
  return (
    <>
      {cfg.landing && (
        <group ref={pad} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
          <mesh>
            <ringGeometry args={[0.95, 1.0, 72]} />
            <meshBasicMaterial ref={padMat} color="#ffb224" transparent depthWrite={false} />
          </mesh>
        </group>
      )}
      <group ref={group}>
        <Model state={state} />
      </group>
    </>
  );
}
