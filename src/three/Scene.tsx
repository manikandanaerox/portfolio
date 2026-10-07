"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import * as THREE from "three";
import { useTheme } from "../lib/theme";
import { Aircraft, W, fleetActivity, type AircraftConfig } from "./Flight";
import { CameraQuad } from "./aircraft/CameraQuad";
import { RacingQuad } from "./aircraft/RacingQuad";
import { InspectionQuad } from "./aircraft/InspectionQuad";
import { Vtol } from "./aircraft/Vtol";
import { AgriHex, AGRI_GEAR_DROP } from "./aircraft/AgriHex";

/*
  The fleet. One aircraft per section; scrolling hands over from one to the
  next, each flying out of frame or in from its own side with its own dynamics.
*/
const FLEET: AircraftConfig[] = [
  {
    id: "camera",
    Model: CameraQuad,
    // Hovers above the centred portrait, nose to the viewer, gimbal aimed down at the face.
    home: { hero: W(0, 0.63, 1.15, 0.25, { look: 0.55 }) },
    mobileHome: { hero: W(0, 0.66, 0.85, 0.25, { look: 0.5 }) },
    before: W(0, 0.62, 1.0, 0),
    after: W(-2.1, 1.1, 0.9, 0.9),
    dyn: { maxTiltDeg: 30, kpPos: 2.0, kpVel: 3.2, vMax: 8, attRate: 16, yawRate: 1.6, gust: 1 },
  },
  {
    id: "racer",
    Model: RacingQuad,
    home: { about: W(-0.5, -0.02, 1.35, 0.9, { orbit: 1 }) },
    before: W(2.2, -0.5, 1.0, -1.4),
    after: W(-2.4, 0.7, 1.0, 1.6),
    dyn: { maxTiltDeg: 58, kpPos: 3.0, kpVel: 5.5, vMax: 14, attRate: 30, yawRate: 4, gust: 1.3, yawToVelocity: 0.85 },
    orbit: [1.0, 0.28, 0.9, 0.75],
  },
  {
    id: "inspection",
    Model: InspectionQuad,
    exhibit: true,
    home: {
      anatomy: [W(0.32, -0.02, 1.3, 0.4, { explode: 0.08 }), W(0.32, -0.02, 1.3, 0.4 + Math.PI * 1.15, { explode: 1 })],
    },
    mobileHome: {
      anatomy: [W(0, 0.42, 0.8, 0.4, { explode: 0.08 }), W(0, 0.42, 0.8, 0.4 + Math.PI * 1.15, { explode: 1 })],
    },
    before: W(0.3, 2.4, 1.0, 0.4),
    after: W(0.6, 2.8, 0.9, 0.4),
    dyn: { maxTiltDeg: 32, kpPos: 2.1, kpVel: 3.4, vMax: 9, attRate: 16, yawRate: 1.5, gust: 1.15 },
  },
  {
    id: "vtol",
    Model: Vtol,
    vtol: true,
    // Cruises in from the left on the wing, transitions to hover beside the flight log.
    home: { journey: W(0.52, 0.0, 0.9, -0.75) },
    before: W(-2.6, 0.55, 0.9, Math.PI / 2),
    after: W(2.8, 0.9, 0.7, Math.PI / 2),
    dyn: { maxTiltDeg: 22, kpPos: 1.5, kpVel: 2.4, vMax: 11, attRate: 9, yawRate: 1.2, gust: 0.9 },
  },
  {
    id: "agri",
    Model: AgriHex,
    landing: { gearDrop: AGRI_GEAR_DROP },
    home: { contact: W(0.48, -0.1, 0.9, -2.6) },
    before: W(0.7, 2.6, 0.9, -2.6),
    after: W(0.48, -0.1, 0.9, -2.6),
    dyn: { maxTiltDeg: 20, kpPos: 1.5, kpVel: 2.4, vMax: 6, attRate: 8, yawRate: 0.9, gust: 0.75 },
  },
];

/**
 * Compile every aircraft's shaders while the page loads, so a new airframe
 * entering the frame never stalls the main thread mid-scroll.
 */
function Precompile() {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      const hidden: THREE.Object3D[] = [];
      scene.traverse((o) => {
        if (!o.visible) {
          hidden.push(o);
          o.visible = true;
        }
      });
      gl.compile(scene, camera);
      hidden.forEach((o) => (o.visible = false));
    });
    return () => cancelAnimationFrame(id);
  }, [gl, scene, camera]);
  return null;
}

/**
 * Render on demand: frames are requested only while the page scrolls or an
 * aircraft is on screen / still flying. Sections with nothing in the air cost nothing.
 */
function FrameDriver() {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    let raf = 0;
    let lastY = -1;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const y = window.scrollY;
      if (y !== lastY || fleetActivity.size > 0) {
        lastY = y;
        invalidate();
      }
    };
    loop();
    return () => cancelAnimationFrame(raf);
  }, [invalidate]);
  return null;
}

/**
 * Drops to 1x pixel ratio if continuous frames run slower than ~45 fps.
 * Only back-to-back frames are measured, so idle gaps never look like slowness.
 */
function AdaptiveResolution({ onSlow }: { onSlow: () => void }) {
  const acc = useRef({ n: 0, sum: 0, done: false });
  useFrame((_, delta) => {
    const a = acc.current;
    if (a.done || delta > 0.1) return;
    a.n++;
    a.sum += delta;
    if (a.n >= 90) {
      if (a.sum / a.n > 1 / 45) {
        a.done = true;
        onSlow();
      }
      a.n = 0;
      a.sum = 0;
    }
  });
  return null;
}

function Dust() {
  const theme = useTheme();
  const group = useRef<THREE.Group>(null);
  const geometry = useMemo(() => {
    const n = 420;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 22;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 16;
      pos[i * 3 + 2] = -Math.random() * 10 + 1;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    return g;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);

  useFrame(() => {
    // Parallax: dust drifts up slower than the page, wrapping every 16 units.
    if (group.current) group.current.position.y = ((window.scrollY * 0.0018) % 16) - 8;
  });

  const color = theme === "light" ? "#4a525d" : "#a3abb6";
  return (
    <group ref={group}>
      {[0, 16].map((y) => (
        <points key={y} geometry={geometry} position={[0, y, 0]}>
          <pointsMaterial color={color} size={0.03} sizeAttenuation transparent opacity={theme === "light" ? 0.35 : 0.4} depthWrite={false} />
        </points>
      ))}
    </group>
  );
}

export default function Scene() {
  const [ready, setReady] = useState(false);
  const [dpr, setDpr] = useState(() => Math.min(typeof window === "undefined" ? 1 : window.devicePixelRatio, 1.5));
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 transition-opacity duration-[1400ms] ease-out-expo"
      style={{ opacity: ready ? 1 : 0 }}
    >
      <Canvas
        dpr={dpr}
        frameloop="demand"
        camera={{ fov: 35, position: [0, 1.7, 9], near: 0.1, far: 40 }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        eventSource={document.getElementById("root")!}
        eventPrefix="client"
        onCreated={({ camera }) => {
          // Slightly elevated chase-cam view: we see the top of a level aircraft without faking its attitude.
          camera.lookAt(0, 0, 0);
          requestAnimationFrame(() => setReady(true));
        }}
      >
        <ambientLight intensity={0.25} />
        <directionalLight position={[4, 6, 5]} intensity={1.6} />
        <directionalLight position={[-5, 2, -4]} intensity={0.8} color="#ffd9a0" />
        <Suspense fallback={null}>
          {/* CC0 studio HDRI (Poly Haven) for real reflections on paint, carbon and glass. */}
          <Environment files="/hdri/studio_small_09_1k.hdr" environmentIntensity={0.9} />
        </Suspense>
        <Dust />
        {FLEET.map((cfg, i) => (
          <Aircraft key={cfg.id} cfg={cfg} seed={i} />
        ))}
        <Precompile />
        <FrameDriver />
        <AdaptiveResolution onSlow={() => setDpr(1)} />
      </Canvas>
    </div>
  );
}
