"use client";

import { useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useMotionValueEvent, useReducedMotion, useScroll, type MotionValue } from "motion/react";
import { chapters, type ChapterId } from "../content";
import { STEP_VH } from "../lib/stage";
import { scrollToY } from "../lib/scroll";
import { OrgLogos } from "./OrgLogo";

/*
  A pinned chapter. The section is n steps tall; its stage sticks to the viewport
  while the WebGL act (three/acts, drawn into #<id>-stage) follows the same scroll
  progress. The active step is the content: a large title and readable body,
  with a small clickable step index above it. Desktop: text left, scene right.
  Phones: scene on top, text below.
*/

const ease = [0.16, 1, 0.3, 1] as const;
const num = (i: number) => String(i + 1).padStart(2, "0");

type Props = {
  id: ChapterId;
  /** Extra live content under the active step (e.g. computed shock angles). */
  extra?: (progress: MotionValue<number>, step: number) => ReactNode;
};

export function Chapter({ id, extra }: Props) {
  const ch = chapters[id];
  const n = ch.steps.length;
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const [active, setActive] = useState(0);

  useMotionValueEvent(scrollYProgress, "change", (p) => {
    const i = Math.min(n - 1, Math.floor(p * n));
    if (i !== active) setActive(i);
  });

  const goTo = (i: number) => {
    const el = ref.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY;
    scrollToY(top + ((i + 0.5) / n) * (el.offsetHeight - window.innerHeight));
  };

  const step = ch.steps[active];

  return (
    <section id={id} ref={ref} aria-label={ch.nav} className="relative" style={{ height: `calc(100dvh + ${n * STEP_VH}vh)` }}>
      <div id={`${id}-stage`} className="sticky top-0 h-[100dvh] overflow-hidden">
        {/* Phones: fade the lower scene into the page so the card stays legible */}
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-[58%] bg-gradient-to-t from-bg via-bg/90 to-transparent md:hidden" />
        <div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 hidden w-[52%] bg-gradient-to-r from-bg from-30% via-bg/80 to-transparent md:block" />

        <div className="relative mx-auto flex h-full w-full max-w-[1400px] flex-col justify-end px-5 pb-24 md:justify-center md:px-10 md:pb-0">
          <div className="md:max-w-[34rem] lg:max-w-[38rem]">
            {/* Section title: a quiet label for the chapter; the active step carries the weight */}
            <h2 className="text-lg font-semibold tracking-tight text-muted md:text-xl">{ch.title}</h2>

            {/* Step index: numbers you can click, with the active one marked */}
            <nav aria-label={`${ch.nav} steps`} className="mt-4 flex items-center gap-1 md:mt-6">
              {ch.steps.map((st, i) => {
                const on = i === active;
                return (
                  <button
                    key={st.title}
                    type="button"
                    onClick={() => goTo(i)}
                    aria-label={st.title}
                    aria-current={on ? "step" : undefined}
                    className="group relative px-2 py-2 first:pl-0"
                  >
                    <span className={`font-mono text-sm transition-colors duration-300 ${on ? "text-accent" : i < active ? "text-ink/60" : "text-muted/60 group-hover:text-ink"}`}>
                      {num(i)}
                    </span>
                    {on && <motion.span layoutId={`${id}-tick`} className="absolute inset-x-2 bottom-0 h-[2px] rounded-full bg-accent group-first:left-0" />}
                  </button>
                );
              })}
            </nav>

            {/* The active step, large */}
            <div className="mt-5 min-h-[17rem] md:mt-8 md:min-h-[22rem]" aria-live="polite">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={active}
                  initial={reduce ? false : { opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduce ? undefined : { opacity: 0, y: -12 }}
                  transition={{ duration: 0.45, ease }}
                >
                  <p className="font-mono text-xs text-accent md:text-sm">{step.meta}</p>
                  <h3 className="display mt-3 text-[2rem] font-semibold leading-[1.05] tracking-tight md:text-5xl lg:text-[3.6rem]">{step.title}</h3>
                  <p className="mt-5 max-w-[46ch] text-base leading-relaxed text-ink/80 md:mt-6 md:text-lg lg:text-xl lg:leading-relaxed">{step.body}</p>
                  {step.command && (
                    <p className="mt-5 w-fit rounded-[10px] border border-line bg-surface px-3.5 py-2.5 font-mono text-sm text-ink">
                      <span className="text-accent">&gt;</span> {step.command}
                    </p>
                  )}
                  <OrgLogos org={step.logo} className="mt-7" />
                  {extra?.(scrollYProgress, active)}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
