/*
  Scroll geometry shared by the DOM chapters and the WebGL acts.
  Read every frame from useFrame (no React renders): progress comes straight
  from the section's bounding rect, so it follows Lenis' smoothed scroll exactly.
*/

export const SECTION_IDS = ["home", "about", "rocket", "propulsion", "uav", "journey", "contact"] as const;
export type SectionId = (typeof SECTION_IDS)[number];

/** Scroll distance per chapter step, in viewport heights. */
export const STEP_VH = 85;

/** 0 when the section's sticky stage pins, 1 when it unpins. */
export function pinProgress(section: HTMLElement | null) {
  if (!section) return 0;
  const r = section.getBoundingClientRect();
  const travel = r.height - window.innerHeight;
  return travel <= 0 ? 0 : Math.min(1, Math.max(0, -r.top / travel));
}

/** Step position in [0, n): integer part is the active step, used to blend scene keys. */
export const stepPos = (p: number, n: number) => Math.min(n - 1e-4, p * n);

/**
 * Blend between per-step scene keys. Each step holds its key through the middle
 * of its scroll range; the hand-over to the next step is centred on the step
 * boundary (where the text swaps), so the scene settles while its text is read.
 */
export function blendAt(s: number, n: number) {
  const k = Math.min(n - 1, Math.max(0, Math.round(s)));
  const d = s - k; // -0.5 .. 0.5 around boundary k
  if (d >= 0) {
    // inside step k, before its middle: still finishing the hand-over from k-1
    if (k > 0 && d < 0.28) return { a: k - 1, b: k, t: smootherstep(0.5 + d / 0.56) };
    return { a: k, b: k, t: 0 };
  }
  // late in step k-1: starting the hand-over to k
  if (d > -0.28) return { a: k - 1, b: k, t: smootherstep(0.5 + d / 0.56) };
  return { a: k - 1, b: k - 1, t: 0 };
}

export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
export const smootherstep = (x: number) => {
  const t = clamp01(x);
  return t * t * t * (t * (t * 6 - 15) + 10);
};
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export const reducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
