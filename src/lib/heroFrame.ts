/*
  Shared between the hero DOM and the WebGL flight model:
  - the portrait frame element (the drone must never cover it)
  - the latest pointer position and when it last moved (follow-me mode).
*/
export const heroFrame: { el: HTMLElement | null } = { el: null };

export const pointerTrack = { x: 0, y: 0, t: -Infinity, fine: false };

let started = false;
export function trackPointer() {
  if (started || typeof window === "undefined") return;
  started = true;
  pointerTrack.fine = window.matchMedia("(pointer: fine)").matches;
  window.addEventListener(
    "pointermove",
    (e) => {
      if (e.pointerType !== "mouse" && e.pointerType !== "pen") return;
      pointerTrack.x = e.clientX;
      pointerTrack.y = e.clientY;
      pointerTrack.t = performance.now();
    },
    { passive: true },
  );
}
