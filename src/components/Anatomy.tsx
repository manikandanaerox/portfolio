"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion, useMotionValueEvent, useReducedMotion, useScroll } from "motion/react";
import { anatomy } from "../content";
import { DassaultLogo } from "./DassaultLogo";

/*
  Pinned section. The WebGL drone explodes as this section scrolls
  (see three/Scene.tsx); this list tracks which part is being shown.
*/
export function Anatomy() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const [active, setActive] = useState(-1);

  useMotionValueEvent(scrollYProgress, "change", (p) => {
    // Matches the scene: parts highlight once the drone is mostly exploded.
    const i = p < 0.04 ? -1 : Math.min(anatomy.length - 1, Math.floor(p * anatomy.length));
    if (i !== active) setActive(i);
  });

  const current = active >= 0 ? anatomy[active] : null;

  return (
    <section id="anatomy" ref={ref} className="relative h-[460vh]">
      <div className="sticky top-0 flex h-[100dvh] items-end overflow-hidden md:items-center">
        <div className="mx-auto grid w-full max-w-[1400px] grid-cols-1 px-5 pb-10 md:grid-cols-12 md:px-10 md:pb-0">
          <div className="md:col-span-5 lg:col-span-4">
            <h2 className="display text-[2.4rem] font-semibold leading-[1] md:text-6xl">Every system, a part of my work.</h2>
            <p className="mt-5 max-w-[42ch] text-muted">Scroll to take the drone apart. Each part maps to something I have designed, tested or researched.</p>

            {/* Desktop: full list with the active part expanded */}
            <ol className="mt-10 hidden md:block">
              {anatomy.map((part, i) => {
                const on = i === active;
                return (
                  <li key={part.key} className="relative py-2.5 pl-5">
                    <span
                      aria-hidden
                      className={`absolute left-0 top-[1.05rem] h-px transition-all duration-500 ease-out-expo ${on ? "w-3 bg-accent" : "w-1.5 bg-line-strong"}`}
                    />
                    <p className={`text-lg font-medium tracking-tight transition-colors duration-500 ${on ? "text-ink" : "text-muted/70"}`}>
                      {part.name}
                    </p>
                    <motion.div
                      initial={false}
                      animate={{ height: on ? "auto" : 0, opacity: on ? 1 : 0 }}
                      transition={{ duration: reduce ? 0 : 0.5, ease: [0.16, 1, 0.3, 1] }}
                      className="overflow-hidden"
                    >
                      <p className="max-w-[40ch] pt-1.5 text-sm leading-relaxed text-muted">{part.note}</p>
                      <p className="flex items-center gap-2.5 pt-2 font-mono text-xs text-accent">
                        {part.where}
                        {part.dassault && <DassaultLogo className="h-5 text-ink" />}
                      </p>
                    </motion.div>
                  </li>
                );
              })}
            </ol>

            {/* Mobile: only the active part, crossfading */}
            <div className="mt-6 min-h-[7.5rem] md:hidden" aria-live="polite">
              <AnimatePresence mode="wait">
                {current && (
                  <motion.div
                    key={current.key}
                    initial={reduce ? false : { opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.35 }}
                    className="glass rounded-[14px] p-4"
                  >
                    <p className="font-mono text-sm text-accent">{current.name}</p>
                    <p className="mt-1 text-sm leading-relaxed text-muted">{current.note}</p>
                    <p className="mt-2 font-mono text-xs text-accent">{current.where}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
