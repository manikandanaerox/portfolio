import type { RefObject } from "react";
import * as THREE from "three";
import { pinProgress } from "../../lib/stage";

export type ActProps = { stage: RefObject<HTMLElement> };

/** Step position (0..n) of the chapter that owns this stage. */
export const stepOf = (stage: RefObject<HTMLElement>, n: number) => Math.min(n - 1e-4, pinProgress(stage.current?.parentElement ?? null) * n);

/** Phones (portrait views) get their own framing. */
export const isPortrait = (camera: THREE.Camera) => (camera as THREE.PerspectiveCamera).aspect < 0.85;

/**
 * Shift the projection so the scene composes beside the text panel:
 * right of the panel on desktop, above the step card on phones.
 */
export function composeView(camera: THREE.PerspectiveCamera, right = 0.17, up = 0.2) {
  const a = camera.aspect;
  const h = 1000;
  const w = h * a;
  if (a >= 0.85) camera.setViewOffset(w, h, -right * w, 0, w, h);
  else camera.setViewOffset(w, h, 0, up * h, w, h);
}

/** Damped vector step, frame-rate independent. */
export const dampV = (v: THREE.Vector3, to: THREE.Vector3, lambda: number, dt: number) => v.lerp(to, 1 - Math.exp(-lambda * dt));
