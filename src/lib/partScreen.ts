import type { PartKey } from "../content";

/*
  Exploded-view callouts: where each part of the inspection drone is on screen,
  written by the WebGL model every rendered frame and read by the DOM overlay
  (components/AnatomyCallouts). Plain mutable object: no React renders.
*/
export const partScreen = {
  on: false, // drone visible and exploded enough to label
  t: 0, // performance.now() of the last write
  cx: 0, // drone centre, px
  cy: 0,
  pts: new Map<PartKey, { x: number; y: number }>(),
};
