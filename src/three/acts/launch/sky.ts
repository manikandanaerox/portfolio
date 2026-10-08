import * as THREE from "three";

/*
  Night sky for the launch, drawn on the inside of a large sphere.
    - gradient zenith -> horizon with light pollution and a faint airglow band
    - Milky Way: a band about a tilted great circle, fbm brightness with dark dust lanes
    - stars: jittered points in 3D cells (two layers, denser inside the band), sized in
      screen pixels via uPx (radians per pixel) so they stay pin-sharp at any zoom;
      magnitudes follow a steep power law, colours span blue-white to orange, and
      they scintillate more near the horizon
    - the Moon: limb-darkened disc with maria and a halo; it is also the key light
  Day mode (light theme) keeps only the gradient and a sun halo.
*/

export const SKY_VERT = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const SKY_FRAG = /* glsl */ `
  uniform vec3 uHorizon; uniform vec3 uZenith; uniform vec3 uGlow;
  uniform float uNight; uniform float uTime; uniform float uPx;
  uniform vec3 uMoonDir; uniform vec3 uBandN;
  varying vec3 vDir;

  float h13(vec3 p) { p = fract(p * 0.1031); p += dot(p, p.yzx + 33.33); return fract((p.x + p.y) * p.z); }
  vec3 h33(vec3 p) { p = fract(p * vec3(0.1031, 0.1030, 0.0973)); p += dot(p, p.yxz + 33.33); return fract((p.xxy + p.yxx) * p.zyx); }
  float vnoise(vec3 p) {
    vec3 i = floor(p), f = fract(p);
    vec3 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(h13(i), h13(i + vec3(1, 0, 0)), u.x), mix(h13(i + vec3(0, 1, 0)), h13(i + vec3(1, 1, 0)), u.x), u.y),
               mix(mix(h13(i + vec3(0, 0, 1)), h13(i + vec3(1, 0, 1)), u.x), mix(h13(i + vec3(0, 1, 1)), h13(i + vec3(1, 1, 1)), u.x), u.y), u.z);
  }
  float fbm(vec3 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { s += vnoise(p) * a; p *= 2.03; a *= 0.5; } return s; }

  vec3 stars(vec3 d, float scale, float density, float boost) {
    vec3 p = d * scale;
    vec3 c = floor(p);
    vec3 r = h33(c);
    if (r.x > density) return vec3(0.0);
    vec3 sp = c + 0.2 + 0.6 * h33(c + 7.0);
    float dist = length(p - sp) / scale;               // ~ angular distance, radians
    float mag = pow(h13(c + 3.0), 7.0);                // few bright, many faint
    float size = uPx * (0.55 + 1.6 * mag);
    float core = exp(-(dist * dist) / (size * size));          // gaussian PSF: sub-pixel stars still register
    float halo = exp(-dist / (uPx * 2.5)) * mag * 0.25;
    vec3 tint = mix(vec3(0.72, 0.82, 1.0), vec3(1.0, 0.86, 0.66), smoothstep(0.3, 1.0, h13(c + 11.0)));
    float low = 1.0 - smoothstep(0.02, 0.45, d.y);
    float tw = 1.0 + (0.18 + 0.5 * low) * sin(uTime * (3.0 + h13(c) * 9.0) + h13(c + 5.0) * 60.0);
    return tint * (core + halo) * (0.1 + 2.4 * mag) * tw * boost;
  }

  void main() {
    vec3 d = normalize(vDir);
    float e = d.y;
    float up = max(e, 0.0);
    vec3 col = mix(uHorizon, uZenith, pow(up, 0.42));
    col += uGlow * exp(-up * 7.0) * 0.75;                     // light pollution / dusk on the horizon

    // Moon (night) or sun halo (day).
    float md = dot(d, uMoonDir);
    if (uNight > 0.5) {
      // Airglow: faint green band ~10 degrees up.
      col += vec3(0.02, 0.05, 0.03) * exp(-pow((e - 0.16) / 0.07, 2.0)) * 0.6;

      // Milky Way.
      float bd = dot(d, uBandN);
      float band = exp(-bd * bd / 0.022);
      float mw = band * (0.45 + 0.55 * fbm(d * 5.0 + 2.0));
      float dust = band * smoothstep(0.42, 0.72, fbm(d * 9.0 + 7.0)) * exp(-bd * bd / 0.004);
      float ext = smoothstep(0.0, 0.3, e);                      // atmospheric extinction near the horizon
      col += vec3(0.5, 0.55, 0.7) * max(mw * 0.085 - dust * 0.06, 0.0) * ext;

      col += (stars(d, 150.0, 0.13, 1.0) + stars(d, 360.0, 0.04 + band * 0.28, 0.7) + stars(d, 800.0, band * 0.22, 0.45)) * ext;

      // Moon disc: limb darkening and maria.
      float R = 0.0095;
      float dm = acos(clamp(md, -1.0, 1.0));
      if (dm < R * 1.2) {
        vec3 t1 = normalize(cross(uMoonDir, vec3(0.0, 1.0, 0.0)));
        vec3 t2 = cross(t1, uMoonDir);
        vec2 q = vec2(dot(d, t1), dot(d, t2)) / R;
        float r = length(q);
        float disc = smoothstep(1.0, 0.96, r);
        float maria = smoothstep(0.45, 0.62, fbm(vec3(q * 2.2, 3.0))) * 0.35 + smoothstep(0.55, 0.7, fbm(vec3(q * 5.0, 9.0))) * 0.15;
        float limb = sqrt(max(0.0, 1.0 - r * r));
        vec3 moon = vec3(1.0, 0.97, 0.9) * (0.55 + 0.45 * limb) * (1.0 - maria);
        col = mix(col, moon * 1.1, disc);
      }
      col += vec3(0.75, 0.8, 0.9) * (exp(-dm * 160.0) * 0.18 + exp(-dm * 18.0) * 0.05);
    } else {
      col += vec3(1.0, 0.95, 0.85) * (exp(-acos(clamp(md, -1.0, 1.0)) * 40.0) * 0.5);
    }
    gl_FragColor = vec4(col, 1.0);
  }
`;

export function skyUniforms() {
  return {
    uHorizon: { value: new THREE.Color() },
    uZenith: { value: new THREE.Color() },
    uGlow: { value: new THREE.Color() },
    uNight: { value: 1 },
    uTime: { value: 0 },
    uPx: { value: 0.001 },
    // The Moon sits up and to the right of the pad as seen from the tracking camera.
    uMoonDir: { value: new THREE.Vector3(0.05, 0.36, -0.93).normalize() },
    // Milky Way arching high across the sky behind the pad.
    uBandN: { value: new THREE.Vector3(0.62, 0.35, 0.7).normalize() },
  };
}
