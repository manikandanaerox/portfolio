import * as THREE from "three";

/* GLSL shared by the engine acts: flame shells, exhaust plume with shock diamonds, soft gas particles. */

export const FLAME_VERT = /* glsl */ `
  varying vec3 vPos;
  varying vec3 vN;
  varying vec3 vView;
  void main() {
    vPos = position;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vN = normalize(normalMatrix * normal);
    vView = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;

export const FLAME_FRAG = /* glsl */ `
  uniform float uTime;
  uniform float uPower;
  uniform vec3 uHot;
  uniform vec3 uCore;
  uniform float uVertical; // 0: axis +x (aircraft engine), 1: axis -y (rocket engine, flow downward)
  uniform vec4 uSpan;      // fade in from .x to .y, out from .z to .w, along the flow
  varying vec3 vPos;
  varying vec3 vN;
  varying vec3 vView;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
  }
  void main() {
    float ang = mix(atan(vPos.y, vPos.z), atan(vPos.x, vPos.z), uVertical);
    float x = mix(vPos.x, -vPos.y, uVertical);
    vec2 q = vec2(x * 3.0 - uTime * 2.6, ang * 2.5);
    float n = noise(q) * 0.6 + noise(q * 2.3 + 4.0) * 0.4;
    float along = smoothstep(uSpan.x, uSpan.y, x) * (1.0 - smoothstep(uSpan.z, uSpan.w, x));
    float rim = pow(1.0 - abs(dot(vN, vView)), 1.5);
    float a = along * (0.35 + 0.65 * n) * (0.45 + 0.55 * rim) * uPower;
    vec3 col = mix(uHot, uCore, smoothstep(0.55, 0.95, n));
    gl_FragColor = vec4(col * a, a);
  }
`;

export const PLUME_FRAG = /* glsl */ `
  uniform float uTime;
  uniform float uPower;
  uniform vec3 uHot;
  uniform vec3 uCore;
  uniform float uCell;    // shock-cell length (fraction of the plane)
  uniform float uDiamond; // strength of the diamond pattern (low for solid boosters)
  uniform float uSpread;  // how fast the jet widens downstream
  uniform float uDecay;
  varying vec2 vUv;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  void main() {
    float u = vUv.x;                 // 0 at the nozzle exit
    float r = abs(vUv.y - 0.5) * 2.0; // 0 on the axis
    float L = uCell;
    float fr = fract(u / L);
    float env = 0.42 * (1.0 + 0.16 * sin(6.2831 * u / L)) * (1.0 + u * uSpread);
    // Shock diamonds: crossing oblique waves in each cell, plus a Mach disk mid-cell.
    float rd = env * abs(1.0 - 2.0 * fr);
    float waves = exp(-abs(r - rd) * 38.0) * (1.0 - smoothstep(0.1, 0.75, u));
    float disk = exp(-abs(fr - 0.5) * 60.0) * step(r, env * 0.32) * (1.0 - smoothstep(0.05, 0.6, u));
    float core = exp(-pow(r / max(env, 1e-3), 2.0) * 2.6);
    float decay = exp(-u * uDecay) * smoothstep(0.0, 0.02, u);
    float flick = 0.85 + 0.15 * hash(vec2(floor(uTime * 24.0), floor(u * 40.0)));
    float a = (core * 0.55 + (waves * 0.9 + disk * 0.8) * uDiamond) * decay * flick * uPower;
    vec3 col = mix(uHot, uCore, clamp(waves + disk + core * 0.4, 0.0, 1.0));
    gl_FragColor = vec4(col * a, a);
  }
`;

export const PLUME_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;

export const DOT_VERT = /* glsl */ `
  attribute vec3 color;
  attribute float size;
  varying vec3 vColor;
  uniform float uScale;
  void main() {
    vColor = color;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = size * uScale / -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

export const DOT_FRAG = /* glsl */ `
  varying vec3 vColor;
  uniform float uOpacity;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float a = smoothstep(0.5, 0.1, length(c)) * uOpacity;
    gl_FragColor = vec4(vColor * a, a);
  }
`;

export const flameUniforms = (hot: string, core: string, vertical: 0 | 1, span: [number, number, number, number]) => ({
  uTime: { value: 0 },
  uPower: { value: 0.6 },
  uHot: { value: new THREE.Color(hot) },
  uCore: { value: new THREE.Color(core) },
  uVertical: { value: vertical },
  uSpan: { value: new THREE.Vector4(...span) },
});

export const plumeUniforms = (hot: string, core: string, o: { cell?: number; diamond?: number; spread?: number; decay?: number } = {}) => ({
  uTime: { value: 0 },
  uPower: { value: 0.6 },
  uHot: { value: new THREE.Color(hot) },
  uCore: { value: new THREE.Color(core) },
  uCell: { value: o.cell ?? 0.13 },
  uDiamond: { value: o.diamond ?? 1 },
  uSpread: { value: o.spread ?? 0.9 },
  uDecay: { value: o.decay ?? 2.4 },
});
