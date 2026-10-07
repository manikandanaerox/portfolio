/*
  Section geometry shared between the DOM and the WebGL scene.
  Measured on resize only; read every frame from useFrame without re-rendering React.
*/

export const SECTION_IDS = ["home", "about", "anatomy", "capabilities", "projects", "journey", "contact"] as const;
export type SectionId = (typeof SECTION_IDS)[number];

type Rect = { top: number; height: number };

export const layout = {
  sections: {} as Partial<Record<SectionId, Rect>>,
  vh: 1,
  maxScroll: 1,
  version: 0,
};

export function measure() {
  for (const id of SECTION_IDS) {
    const el = document.getElementById(id);
    if (!el) continue;
    const r = el.getBoundingClientRect();
    layout.sections[id] = { top: r.top + window.scrollY, height: r.height };
  }
  layout.vh = window.innerHeight;
  layout.maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
  layout.version++;
}

export function observeLayout() {
  measure();
  const ro = new ResizeObserver(() => measure());
  ro.observe(document.body);
  window.addEventListener("resize", measure);
  return () => {
    ro.disconnect();
    window.removeEventListener("resize", measure);
  };
}

export const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
