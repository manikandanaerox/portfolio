import Lenis from "lenis";
import { reducedMotion } from "./stage";

let lenis: Lenis | null = null;

export function startSmoothScroll() {
  if (reducedMotion()) return () => {};
  lenis = new Lenis({ autoRaf: true, lerp: 0.09, wheelMultiplier: 0.9 });
  return () => {
    lenis?.destroy();
    lenis = null;
  };
}

export function scrollToId(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  if (lenis) lenis.scrollTo(el, { duration: 1.6 });
  else el.scrollIntoView({ behavior: reducedMotion() ? "auto" : "smooth" });
}

export function scrollToY(y: number) {
  if (lenis) lenis.scrollTo(y, { duration: 1.2 });
  else window.scrollTo({ top: y, behavior: reducedMotion() ? "auto" : "smooth" });
}
