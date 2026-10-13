"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { stock } from "../data/stock";
import { uavShow } from "../lib/uavShow";

/*
  Drone chapter, right side: a roulette of stock drone photos (data/stock, with
  credits). A new photo wipes in every few seconds; each time, one of the
  3D aircraft rises from below to hover above it (three/acts/Fleet reads uavShow).
  Runs only while the chapter is on screen.
*/

const ease = [0.16, 1, 0.3, 1] as const;
const EVERY = 4200;
const SET = stock;

export function UavRoulette() {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const [i, setI] = useState(0);
  const [on, setOn] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setOn(e.isIntersecting), { threshold: 0.3 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    uavShow.index = i;
  }, [i]);

  useEffect(() => {
    if (!on) return;
    const id = window.setInterval(() => setI((n) => n + 1), EVERY);
    return () => window.clearInterval(id);
  }, [on]);

  // Warm the next photo so the wipe never shows an empty frame.
  useEffect(() => {
    const img = new Image();
    img.src = SET[(i + 1) % SET.length].src;
  }, [i]);

  const p = SET[i % SET.length];

  return (
    <div
      ref={ref}
      className="pointer-events-none absolute inset-x-5 top-[12%] h-[22%] md:inset-x-auto md:left-[54%] md:right-10 md:top-[28%] md:h-[54%]"
    >
      <div className="relative h-full w-full overflow-hidden rounded-[18px] bg-surface-2 ring-1 ring-line-strong shadow-[0_40px_80px_-40px_rgb(0_0_0/0.8)]">
        <AnimatePresence initial={false}>
          <motion.img
            key={p.src}
            src={p.src}
            alt={p.caption}
            className="absolute inset-0 h-full w-full object-cover"
            initial={reduce ? { opacity: 0 } : { clipPath: "inset(0% 0% 100% 0%)", scale: 1.08 }}
            animate={{ opacity: 1, clipPath: "inset(0% 0% 0% 0%)", scale: 1, transition: { duration: 1.1, ease } }}
            exit={{ opacity: 1, transition: { duration: 1.1 } }}
          />
        </AnimatePresence>
      </div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.p
          key={p.src}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.35, ease }}
          className="pointer-events-auto mt-3 flex flex-wrap items-baseline gap-x-3 text-sm md:text-base"
        >
          <span className="text-ink">{p.caption}</span>
          <a href={p.source} target="_blank" rel="noreferrer" className="font-mono text-[11px] text-muted hover:text-ink">
            Photo: {p.author}, {p.license}
          </a>
        </motion.p>
      </AnimatePresence>
    </div>
  );
}
