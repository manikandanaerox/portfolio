"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from "motion/react";
import { photos, type Photo } from "../data/gallery";

/*
  Fly-through. The section pins and scrolling flies the viewer forward through a
  deep corridor of photos: each one starts as a small, dim print far ahead,
  swells as it approaches, then sweeps past the edge of the screen. Photos sit on
  a golden-angle spiral around the line of flight, so the centre stays open and
  they arrive from every side. The photo being passed is named at the bottom.
  Reduced motion: a plain horizontal row instead.
*/

const ease = [0.16, 1, 0.3, 1] as const;
const DEPTH = 700; // px between photos along the line of flight
const NEAR = 260; // fully passed by here (camera sits at +PERSPECTIVE)
const FAR = 5.2 * DEPTH; // fades in from this distance
const GOLDEN = 137.508 * (Math.PI / 180);

function useViewport() {
  const [v, setV] = useState({ w: 1440, h: 900 });
  useEffect(() => {
    const update = () => setV({ w: window.innerWidth, h: window.innerHeight });
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return v;
}

function Print({ photo, i, travel, place }: { photo: Photo; i: number; travel: MotionValue<number>; place: { x: number; y: number; w: number; h: number } }) {
  const z = useTransform(travel, (t) => -(i + 1) * DEPTH + t);
  const opacity = useTransform(z, [-FAR, -FAR + DEPTH * 1.4, NEAR - 120, NEAR + 260], [0, 1, 1, 0], { clamp: true });
  // Distant prints sit in haze; they clear as they come close.
  const brightness = useTransform(z, [-FAR, -DEPTH * 1.5, 0], [0.35, 0.8, 1], { clamp: true });
  const filter = useTransform(brightness, (b) => `brightness(${b})`);
  const transform = useTransform(z, (zz) => `translate3d(${place.x - place.w / 2}px, ${place.y - place.h / 2}px, ${zz}px)`);
  return (
    <motion.figure
      className="absolute left-0 top-0 overflow-hidden rounded-[10px] shadow-[0_40px_80px_-30px_rgb(0_0_0/0.8)] will-change-transform"
      style={{ width: place.w, height: place.h, transform, opacity, filter }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={photo.src} alt={`${photo.tag}: ${photo.caption}`} width={photo.w} height={photo.h} decoding="async" draggable={false} className="h-full w-full select-none object-cover" />
    </motion.figure>
  );
}

export function Gallery() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { w, h } = useViewport();
  const phone = w < 768;

  // Spiral placement around the line of flight, leaving the centre open.
  const places = useMemo(() => {
    const H = phone ? h * 0.3 : h * 0.46;
    return photos.map((p, i) => {
      const a = i * GOLDEN + 0.6;
      const r = 0.82 + 0.18 * ((i * 5) % 3) / 2;
      const rx = phone ? w * 0.36 : w * 0.4;
      const ry = phone ? h * 0.26 : h * 0.32;
      return { x: Math.cos(a) * rx * r, y: Math.sin(a) * ry * r, w: (H * p.w) / p.h, h: H };
    });
  }, [w, h, phone]);

  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  // Start a few prints back, so the corridor fills in only as the title falls away.
  const total = photos.length * DEPTH + NEAR + 300;
  const raw = useTransform(scrollYProgress, [0, 1], [-2.6 * DEPTH, total]);
  const travel = useSpring(raw, { stiffness: 90, damping: 24, mass: 0.5 });

  // Title falls away as the first prints arrive.
  const titleOpacity = useTransform(scrollYProgress, [0, 0.06, 0.12], [1, 1, 0]);
  const titleScale = useTransform(scrollYProgress, [0, 0.12], [1, 1.35]);

  // The print being passed: the nearest one in front of the viewer.
  const [current, setCurrent] = useState(-1);
  useMotionValueEvent(travel, "change", (t) => {
    let best = -1;
    let bz = Infinity;
    photos.forEach((_, i) => {
      const z = -(i + 1) * DEPTH + t;
      if (z < NEAR - 40 && z > -1.6 * DEPTH && -z < bz) (bz = -z), (best = i);
    });
    if (best !== current) setCurrent(best);
  });
  const p = current >= 0 ? photos[current] : null;

  if (reduce)
    return (
      <section id="gallery" ref={ref} aria-label="Photos" className="relative py-24">
        <h2 className="display px-5 text-[2.4rem] font-semibold leading-[1] md:px-10 md:text-6xl">Off the screen.</h2>
        <ul className="mt-10 flex snap-x gap-4 overflow-x-auto px-5 pb-4 md:px-10">
          {photos.map((ph) => (
            <li key={ph.src} className="shrink-0 snap-start">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={ph.src} alt={`${ph.tag}: ${ph.caption}`} className="h-72 w-auto rounded-[10px] object-cover" loading="lazy" />
            </li>
          ))}
        </ul>
      </section>
    );

  return (
    <section id="gallery" ref={ref} aria-label="Photos" className="relative" style={{ height: `calc(100dvh + ${phone ? 520 : 620}vh)` }}>
      <div className="sticky top-0 h-[100dvh] overflow-hidden">
        {/* Opening title in the void */}
        <motion.div style={{ opacity: titleOpacity, scale: titleScale }} className="pointer-events-none absolute inset-0 grid place-items-center px-5 text-center">
          <div>
            <h2 className="display text-[3rem] font-semibold leading-[0.95] tracking-tight md:text-[clamp(4rem,9vw,9rem)]">Off the screen.</h2>
            <p className="mx-auto mt-5 max-w-[36ch] text-muted md:text-lg">Flying, building and testing with the team, and Paris in between.</p>
          </div>
        </motion.div>

        {/* The corridor */}
        <div className="absolute inset-0" style={{ perspective: phone ? "700px" : "900px", perspectiveOrigin: "50% 50%" }}>
          <div className="absolute left-1/2 top-1/2" style={{ transformStyle: "preserve-3d" }}>
            {photos.map((ph, i) => (
              <Print key={ph.src} photo={ph} i={i} travel={travel} place={places[i]} />
            ))}
          </div>
        </div>

        {/* Flight log line for the print being passed */}
        <div className="pointer-events-none absolute inset-x-0 bottom-24 px-5 md:bottom-10 md:px-10" aria-live="polite">
          <AnimatePresence mode="wait" initial={false}>
            {p && (
              <motion.p
                key={current}
                initial={{ opacity: 0, y: 10, filter: "blur(6px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -8, filter: "blur(6px)" }}
                transition={{ duration: 0.4, ease }}
                className="text-xl font-semibold tracking-tight md:text-3xl"
              >
                <span className="mr-3 align-middle font-mono text-xs font-normal text-accent md:text-sm">{p.tag}</span>
                {p.caption}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
