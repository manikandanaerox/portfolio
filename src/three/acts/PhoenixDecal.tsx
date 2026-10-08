"use client";

import { useEffect, useMemo } from "react";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";

/*
  Easter egg: the Team Phoenix mark applied as a decal (on the launch vehicle and
  on one drone). The logo is flame on black, so the black is keyed out by
  luminance and the flames are painted on top of whatever surface is underneath.
  Either a flat patch, or a curved strip that wraps a cylinder of `radius`.
*/

const URL = "/images/team-phoenix.webp";
const ASPECT = 900 / 472;

const VERT = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;
const FRAG = /* glsl */ `
  uniform sampler2D uMap; uniform float uBright;
  varying vec2 vUv;
  void main() {
    vec4 c = texture2D(uMap, vUv);
    float a = smoothstep(0.05, 0.35, max(c.r, max(c.g, c.b)));
    gl_FragColor = vec4(c.rgb * uBright, a);
    #include <colorspace_fragment>
  }
`;

type Props = {
  width: number;
  /** Wrap around a cylinder of this radius (around +y), centred at angle `angle` (0 = +z). */
  radius?: number;
  angle?: number;
  position?: [number, number, number];
  rotation?: [number, number, number];
  brightness?: number;
};

export function PhoenixDecal({ width, radius, angle = 0, position = [0, 0, 0], rotation, brightness = 0.9 }: Props) {
  const map = useTexture(URL);
  const height = width / ASPECT;
  const geometry = useMemo(() => {
    if (!radius) return new THREE.PlaneGeometry(width, height);
    const span = width / radius;
    return new THREE.CylinderGeometry(radius, radius, height, 24, 1, true, angle - span / 2, span);
  }, [width, height, radius, angle]);
  const material = useMemo(() => {
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = 8;
    return new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms: { uMap: { value: map }, uBright: { value: brightness } },
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -4,
    });
  }, [map, brightness]);
  useEffect(() => () => (geometry.dispose(), material.dispose()), [geometry, material]);
  return <mesh geometry={geometry} material={material} position={position} rotation={rotation} renderOrder={2} />;
}
