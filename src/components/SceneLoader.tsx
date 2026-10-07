"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

// Three.js is client-only and code-split, so the hero text paints before the 3D bundle arrives.
const Scene = dynamic(() => import("@/three/Scene"), { ssr: false });

function hasWebGL() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

export function SceneLoader() {
  const [ok, setOk] = useState(false);
  useEffect(() => setOk(hasWebGL()), []);
  return ok ? <Scene /> : null;
}
