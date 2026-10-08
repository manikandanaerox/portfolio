"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion, useMotionValueEvent, useReducedMotion, useScroll } from "motion/react";
import { anatomy } from "../content";
import { scrollToY } from "../lib/scroll";
import { AnatomyCallouts } from "./AnatomyCallouts";
import { OrgLogo } from "./OrgLogo";

/*
  Exploded-view drawing. The section pins while the WebGL drone comes apart
  (three/Scene.tsx); every part carries a numbered balloon and leader line
  (AnatomyCallouts), and the parts list uses the same numbers, so each line of
  the list points at a real piece of the aircraft. Scrolling steps through the
  parts; clicking a row jumps to it.
*/

const ease = [0.16, 1, 0.3, 1] as const;
const num = (i: number) => String(i + 1).padStart(2, "0");

export function Anatomy() {
  const ref = useRef<HTMLElement>(null);
  const column = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const [active, setActive] = useState(-1);
  const n = anatomy.length;

  useMotionValueEvent(scrollYProgress, "change", (p) => {
    // Matches the scene: parts highlight once the drone is mostly exploded.
    const i = p < 0.06 ? -1 : Math.min(n - 1, Math.floor(((p - 0.06) / 0.94) * n));
    if (i !== active) setActive(i);
  });

  const goTo = (i: number) => {
    const el = ref.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY;
    const travel = el.offsetHeight - window.innerHeight;
    scrollToY(top + (0.06 + ((i + 0.5) / n) * 0.94) * travel);
  };

  const current = active >= 0 ? anatomy[active] : null;

  return (
    <section id="anatomy" ref={ref} className="relative h-[420vh] md:h-[460vh]">
      <AnatomyCallouts active={active} section={ref} bound={column} />
      <div className="sticky top-0 flex h-[100dvh] items-end overflow-hidden md:items-center">
        <div className="mx-auto grid w-full max-w-[1400px] grid-cols-1 px-5 pb-24 md:grid-cols-12 md:px-10 md:pb-0">
          <div ref={column} className="md:col-span-5 lg:col-span-4">
            <h2 className="display text-[2rem] font-semibold leading-[1.02] md:text-5xl lg:text-[3.4rem]">
              Every system, a part of my work.
            </h2>
            <p className="mt-4 max-w-[40ch] text-sm leading-relaxed text-muted md:mt-5 md:text-base">
              An exploded view of the inspection drone. Each numbered part is something I have designed, tested or researched.
            </p>

            {/* Desktop: the parts list, numbered like the balloons on the drawing */}
            <ol className="relative mt-9 hidden md:block">
              <span aria-hidden className="absolute bottom-3 left-[0.95rem] top-3 w-px bg-line" />
              {anatomy.map((part, i) => {
                const on = i === active;
                return (
                  <li key={part.key} className="relative">
                    <button
                      type="button"
                      onClick={() => goTo(i)}
                      aria-current={on ? "step" : undefined}
                      className="group grid w-full grid-cols-[2rem_1fr] items-start gap-3 py-2 text-left"
                    >
                      <span
                        className={`relative grid h-[1.9rem] w-[1.9rem] place-items-center rounded-full border font-mono text-[11px] transition-colors duration-300 ${
                          on ? "border-accent bg-accent text-accent-ink" : "border-line-strong bg-bg text-muted group-hover:text-ink"
                        }`}
                      >
                        {num(i)}
                      </span>
                      <span className="pt-[0.2rem]">
                        <span
                          className={`block text-[1.05rem] font-medium tracking-tight transition-colors duration-300 ${
                            on ? "text-ink" : "text-muted group-hover:text-ink"
                          }`}
                        >
                          {part.name}
                        </span>
                        <motion.span
                          initial={false}
                          animate={{ height: on ? "auto" : 0, opacity: on ? 1 : 0 }}
                          transition={{ duration: reduce ? 0 : 0.5, ease }}
                          className="block overflow-hidden"
                        >
                          <span className="block max-w-[38ch] pt-1.5 text-sm leading-relaxed text-muted">{part.note}</span>
                          <span className="flex items-center gap-2.5 pt-2 font-mono text-xs text-accent">
                            {part.where}
                            {part.dassault && <OrgLogo org="dassault" className="h-5 text-ink" />}
                          </span>
                        </motion.span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>

            {/* Phones: one part at a time, with a step rail */}
            <div className="mt-5 md:hidden">
              <div className="flex gap-1" aria-hidden>
                {anatomy.map((part, i) => (
                  <span
                    key={part.key}
                    className={`h-[3px] flex-1 rounded-full transition-colors duration-300 ${i <= active ? "bg-accent" : "bg-line-strong"}`}
                  />
                ))}
              </div>
              <div className="mt-4 min-h-[9.5rem]" aria-live="polite">
                <AnimatePresence mode="wait" initial={false}>
                  {current ? (
                    <motion.div
                      key={current.key}
                      initial={reduce ? false : { opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={reduce ? undefined : { opacity: 0, y: -10 }}
                      transition={{ duration: 0.3, ease }}
                      className="grid grid-cols-[2.4rem_1fr] gap-3"
                    >
                      <span className="grid h-[2.2rem] w-[2.2rem] place-items-center rounded-full bg-accent font-mono text-xs font-medium text-accent-ink">
                        {num(active)}
                      </span>
                      <span>
                        <span className="block text-lg font-semibold tracking-tight">{current.name}</span>
                        <span className="mt-1 block text-sm leading-relaxed text-muted">{current.note}</span>
                        <span className="mt-2 flex items-center gap-2.5 font-mono text-xs text-accent">
                          {current.where}
                          {current.dassault && <OrgLogo org="dassault" className="h-4 text-ink" />}
                        </span>
                      </span>
                    </motion.div>
                  ) : (
                    <motion.p
                      key="intro"
                      initial={false}
                      exit={reduce ? undefined : { opacity: 0 }}
                      className="font-mono text-xs text-muted"
                    >
                      Scroll to take it apart.
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
