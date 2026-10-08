"use client";

import { Suspense, useEffect, useRef, useState, type RefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { View } from "@react-three/drei";
import { LaunchAct } from "./acts/Launch";
import { RocketEngineAct } from "./acts/RocketEngine";
import { EngineAct } from "./acts/Engine";
import { FleetAct } from "./acts/Fleet";

/*
  One WebGL canvas, fixed behind the page, drawing four acts. Each act is a drei
  <View> that tracks its section's sticky stage: the act renders only into that
  rectangle, so it scrolls in and out with its section and costs nothing while
  off screen. When no act is on screen the frame loop stops entirely.
*/

const ACTS = [
  { id: "home", stage: "home-stage", Act: LaunchAct },
  { id: "rocket", stage: "rocket-stage", Act: RocketEngineAct },
  { id: "propulsion", stage: "propulsion-stage", Act: EngineAct },
  { id: "uav", stage: "uav-stage", Act: FleetAct },
] as const;

/** Clears the whole canvas before the views draw (they only clear their own rects). */
function Clear() {
  useFrame(({ gl }) => {
    gl.setScissorTest(false);
    gl.clear(true, true, true);
  }, 1);
  return null;
}

/** Runs the frame loop only while at least one act's stage is on screen. */
function FrameGate({ els }: { els: HTMLElement[] }) {
  const setFrameloop = useThree((s) => s.setFrameloop);
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    const live = new Set<Element>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) (e.isIntersecting ? live.add(e.target) : live.delete(e.target));
        if (live.size) setFrameloop("always");
        else {
          setFrameloop("never");
          gl.setScissorTest(false);
          gl.clear(true, true, true);
        }
      },
      { rootMargin: "120px 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [els, setFrameloop, gl]);
  return null;
}

/** Drops to 1x pixel ratio if frames run slower than ~45 fps. */
function AdaptiveResolution({ onSlow }: { onSlow: () => void }) {
  const acc = useRef({ n: 0, sum: 0, done: false });
  useFrame((_, delta) => {
    const a = acc.current;
    if (a.done || delta > 0.1) return;
    a.n++;
    a.sum += delta;
    if (a.n >= 120) {
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

export default function Scene() {
  const [tracks, setTracks] = useState<{ id: string; ref: RefObject<HTMLElement>; Act: (typeof ACTS)[number]["Act"] }[]>([]);
  const [dpr, setDpr] = useState(() => Math.min(window.devicePixelRatio, 1.5));
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setTracks(
      ACTS.flatMap(({ id, stage, Act }) => {
        const el = document.getElementById(stage);
        return el ? [{ id, ref: { current: el }, Act }] : [];
      }),
    );
  }, []);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 transition-opacity duration-[1200ms] ease-out-expo"
      style={{ opacity: ready ? 1 : 0 }}
    >
      <Canvas
        dpr={dpr}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        onCreated={() => requestAnimationFrame(() => setReady(true))}
      >
        <Clear />
        {tracks.length > 0 && <FrameGate els={tracks.map((t) => t.ref.current)} />}
        {tracks.map(({ id, ref, Act }, i) => (
          <View key={id} track={ref} index={i + 2}>
            <Suspense fallback={null}>
              <Act stage={ref} />
            </Suspense>
          </View>
        ))}
        <AdaptiveResolution onSlow={() => setDpr(1)} />
      </Canvas>
    </div>
  );
}
