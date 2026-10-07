/*
  Where each aircraft is on screen, written by the WebGL flight model every
  rendered frame and read by DOM effects (rotor downwash on text).
  Plain mutable map: no React renders.
*/
export type ScreenAircraft = {
  x: number; // px, viewport
  y: number; // px, viewport
  r: number; // px, half rotor span on screen
  power: number; // 0..1 lift-rotor output
};

export const fleetScreen = new Map<string, ScreenAircraft>();
