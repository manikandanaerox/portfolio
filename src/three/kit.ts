"use client";

import * as THREE from "three";
import type { PartKey } from "../content";

/*
  Shared building blocks for every airframe in the fleet: per-frame state,
  procedural textures, materials and geometry helpers.
*/

export type AircraftState = {
  explode: number; // exploded-view amount (inspection quad only)
  active: PartKey | null; // highlighted part in the exploded view
  lift: number; // lift-motor spool, 0 stopped .. 1 hover
  cruise: number; // VTOL: 0 hover .. 1 wing-borne cruise (pusher on, lift rotors parked)
  gimbalPitch: number; // camera tilt below horizon
  t: number; // sim time, for lights
};

export const newAircraftState = (): AircraftState => ({ explode: 0, active: null, lift: 1, cruise: 0, gimbalPitch: 0, t: 0 });

export const UP = new THREE.Vector3(0, 1, 0);

// ---------- textures ----------

/** 2x2 twill weave. `scale` controls weave density in the canvas. */
export function carbonTexture(cells = 16, light = "#2c2f34", dark = "#15171a") {
  const s = 128;
  const c = document.createElement("canvas");
  c.width = c.height = s;
  const g = c.getContext("2d")!;
  const cell = s / cells;
  for (let y = 0; y < cells; y++) {
    for (let x = 0; x < cells; x++) {
      const along = Math.floor((x + y) / 2) % 2 === 0;
      const x0 = x * cell;
      const y0 = y * cell;
      const grad = along ? g.createLinearGradient(x0, y0, x0, y0 + cell) : g.createLinearGradient(x0, y0, x0 + cell, y0);
      grad.addColorStop(0, dark);
      grad.addColorStop(0.5, light);
      grad.addColorStop(1, dark);
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
export function discTexture() {
  const s = 256;
  const c = document.createElement("canvas");
  c.width = c.height = s;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  grad.addColorStop(0, "rgba(255,255,255,0)");
  grad.addColorStop(0.12, "rgba(255,255,255,0)");
  grad.addColorStop(0.2, "rgba(255,255,255,0.32)");
  grad.addColorStop(0.7, "rgba(255,255,255,0.2)");
  grad.addColorStop(0.9, "rgba(255,255,255,0.38)");
  grad.addColorStop(0.96, "rgba(255,255,255,0.1)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, s, s);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Printed label strip (battery wraps, tank markings). */
export function labelTexture(lines: string[], bg = "#c9cbc8", fg = "#1a1b1d") {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 128;
  const g = c.getContext("2d")!;
  g.fillStyle = bg;
  g.fillRect(0, 0, 256, 128);
  g.fillStyle = fg;
  g.font = "bold 30px monospace";
  lines.forEach((l, i) => g.fillText(l, 16, 44 + i * 40));
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// ---------- materials ----------

export const LED = {
  red: () => new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 0.2, 0.12), toneMapped: false }),
  green: () => new THREE.MeshBasicMaterial({ color: new THREE.Color(0.15, 3, 0.8), toneMapped: false }),
  white: () => new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 3.2, 3.2), toneMapped: false }),
};

export function propMaterials(color = "#141518", tint = "#9aa0a6", translucent = 1) {
  const disc = discTexture();
  return {
    prop: new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.05, transparent: true, opacity: translucent }),
    disc: new THREE.MeshBasicMaterial({ map: disc, color: tint, transparent: true, depthWrite: false, opacity: 0, side: THREE.DoubleSide }),
    textures: [disc],
  };
}

/** Disposes every material/geometry/texture found (recursively) in a plain object of assets. */
export function disposeAll(obj: unknown) {
  const seen = new Set<unknown>();
  const walk = (v: unknown) => {
    if (!v || typeof v !== "object" || seen.has(v)) return;
    seen.add(v);
    if (v instanceof THREE.Material || v instanceof THREE.BufferGeometry || v instanceof THREE.Texture) {
      v.dispose();
      return;
    }
    Object.values(v as Record<string, unknown>).forEach(walk);
  };
  walk(obj);
}

// ---------- geometry ----------

/** Plan polygon (x, z with +z forward) extruded upward with a soft chamfer, centred on y = 0. */
export function extrudePlan(pts: [number, number][], height: number, bevel: number, scale = 1, curveSegments = 6) {
  const s = new THREE.Shape();
  pts.forEach(([x, z], i) => (i ? s.lineTo(x * scale, -z * scale) : s.moveTo(x * scale, -z * scale)));
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, {
    depth: Math.max(0.001, height - bevel * 2),
    bevelEnabled: true,
    bevelSize: bevel,
    bevelThickness: bevel,
    bevelSegments: 4,
    curveSegments,
  });
  g.rotateX(-Math.PI / 2);
  g.translate(0, -height / 2 + bevel, 0);
  g.computeVertexNormals();
  return g;
}

/** Rounded plan shape from a smooth closed curve through points (for pebble-like shells). */
export function extrudeSmoothPlan(pts: [number, number][], height: number, bevel: number) {
  const curve = new THREE.CatmullRomCurve3(pts.map(([x, z]) => new THREE.Vector3(x, -z, 0)), true, "centripetal");
  const s = new THREE.Shape(curve.getPoints(64).map((p) => new THREE.Vector2(p.x, p.y)));
  const g = new THREE.ExtrudeGeometry(s, {
    depth: Math.max(0.001, height - bevel * 2),
    bevelEnabled: true,
    bevelSize: bevel,
    bevelThickness: bevel,
    bevelSegments: 6,
  });
  g.rotateX(-Math.PI / 2);
  g.translate(0, -height / 2 + bevel, 0);
  g.computeVertexNormals();
  return g;
}

/** Side-profile polygon (z forward, y up) extruded across X, centred on x = 0. */
export function extrudeProfile(pts: [number, number][], width: number, bevel: number) {
  const s = new THREE.Shape();
  pts.forEach(([z, y], i) => (i ? s.lineTo(z, y) : s.moveTo(z, y)));
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, {
    depth: Math.max(0.001, width - bevel * 2),
    bevelEnabled: true,
    bevelSize: bevel,
    bevelThickness: bevel,
    bevelSegments: 3,
  });
  g.translate(0, 0, -width / 2 + bevel);
  g.rotateY(Math.PI / 2); // profile z -> world z, extrusion -> world x
  g.computeVertexNormals();
  return g;
}

/** Cylinder spanning two points. */
export function tube(a: THREE.Vector3 | [number, number, number], b: THREE.Vector3 | [number, number, number], r: number, seg = 16, r2 = r) {
  const A = Array.isArray(a) ? new THREE.Vector3(...a) : a;
  const B = Array.isArray(b) ? new THREE.Vector3(...b) : b;
  const dir = new THREE.Vector3().subVectors(B, A);
  const len = dir.length();
  const g = new THREE.CylinderGeometry(r2, r, len, seg, 1);
  g.translate(0, len / 2, 0);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(UP, dir.normalize()));
  g.translate(A.x, A.y, A.z);
  return g;
}

/** Smooth hose along points. */
export function hose(points: [number, number, number][], r: number) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
  return new THREE.TubeGeometry(curve, 32, r, 8, false);
}

export type BladeSpec = {
  R: number; // tip radius
  root?: number; // hub clearance
  chord?: number; // max chord
  tipChord?: number;
  twistRoot?: number;
  twistTip?: number;
  droop?: number;
  sweep?: number; // tip sweep back (racing props)
};

/** Single blade along +X with pitch twist, droop and optional sweep. Mirror Z for opposite rotation. */
export function bladeGeometry(spec: BladeSpec) {
  const { R, root = 0.04, chord = 0.07, tipChord = 0.025, twistRoot = 0.32, twistTip = 0.09, droop = 0.01, sweep = 0 } = spec;
  const s = new THREE.Shape();
  const lead = (t: number) => -chord * 0.55 * Math.sin(Math.PI * Math.min(1, t * 1.15)) * (1 - t * 0.5) - tipChord * 0.4 * t;
  const trail = (t: number) => chord * 0.45 * Math.sin(Math.PI * Math.min(1, 0.25 + t * 0.9)) + tipChord * 0.3 * t;
  const N = 18;
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const x = root + (R - root) * t;
    const sw = sweep * t * t;
    i === 0 ? s.moveTo(x, lead(t) + sw) : s.lineTo(x, lead(t) + sw);
  }
  s.quadraticCurveTo(R + 0.01, sweep, R, trail(1) + sweep);
  for (let i = N; i >= 0; i--) {
    const t = i / N;
    s.lineTo(root + (R - root) * t, trail(t) + sweep * t * t);
  }
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.004, bevelEnabled: true, bevelSize: 0.002, bevelThickness: 0.0015, bevelSegments: 2, curveSegments: 12 });
  g.translate(0, 0, -0.002);
  g.rotateX(-Math.PI / 2);
  const pos = g.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const t = THREE.MathUtils.clamp((v.x - root) / (R - root), 0, 1);
    const a = THREE.MathUtils.lerp(twistRoot, twistTip, t);
    const y = v.y * Math.cos(a) - v.z * Math.sin(a);
    const z = v.y * Math.sin(a) + v.z * Math.cos(a);
    pos.setXYZ(i, v.x, y - t * t * droop, z);
  }
  g.computeVertexNormals();
  return g;
}

/** Rotor speed -> visuals: blur disc fades in and blades fade out as the prop spins up. */
export function updatePropVisuals(spool: number, mats: { prop: THREE.Material; disc: THREE.MeshBasicMaterial }, baseOpacity = 1, discMax = 0.26) {
  const blur = THREE.MathUtils.smoothstep(spool, 0.2, 0.8);
  mats.disc.opacity = blur * discMax;
  mats.prop.opacity = baseOpacity * (1 - blur * 0.88);
}

/** Double-flash anti-collision strobe pattern. */
export const strobeOn = (t: number, period = 1.3, phase = 0) => {
  const ph = (t + phase) % period;
  return ph < 0.05 || (ph > 0.14 && ph < 0.19);
};

/** Rectangular beam from a to b (width across, height up), like a moulded arm. */
export function beam(a: [number, number, number], b: [number, number, number], w: number, h: number, taper = 1) {
  const A = new THREE.Vector3(...a);
  const B = new THREE.Vector3(...b);
  const dir = new THREE.Vector3().subVectors(B, A);
  const len = dir.length();
  const g = new THREE.BoxGeometry(w, h, len, 1, 1, 4);
  g.translate(0, 0, len / 2);
  if (taper !== 1) {
    const pos = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const k = THREE.MathUtils.lerp(1, taper, pos.getZ(i) / len);
      pos.setX(i, pos.getX(i) * k);
      pos.setY(i, pos.getY(i) * k);
    }
  }
  const yaw = Math.atan2(dir.x, dir.z);
  const pitch = -Math.asin(dir.y / len);
  g.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(pitch, yaw, 0, "YXZ")));
  g.translate(A.x, A.y, A.z);
  g.computeVertexNormals();
  return g;
}
