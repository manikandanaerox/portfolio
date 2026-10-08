"use client";

import { useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useMotionValueEvent, useReducedMotion, useScroll, type MotionValue } from "motion/react";
import { chapters, type ChapterId } from "../content";
import { STEP_VH } from "../lib/stage";
import { scrollToY } from "../lib/scroll";
import { OrgLogo } from "./OrgLogo";

/*
  A pinned chapter. The section is n steps tall; its stage sticks to the viewport
  while the WebGL act (three/acts, drawn into #<id>-stage) follows the same scroll
  progress. Desktop: numbered step list on the left, scene on the right.
  Phones: scene on top, the active step as a card below.
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
          <div className="md:max-w-[27rem] lg:max-w-[30rem]">
            <h2 className="display text-[2.1rem] font-semibold leading-[1.02] md:text-5xl lg:text-6xl">{ch.title}</h2>
            <p className="mt-3 max-w-[42ch] text-sm leading-relaxed text-muted md:mt-4 md:text-base">{ch.lead}</p>

            {/* Desktop: every step, numbered, the active one open */}
            <ol className="relative mt-8 hidden md:block">
              <span aria-hidden className="absolute bottom-3 left-[0.95rem] top-3 w-px bg-line" />
              {ch.steps.map((st, i) => {
                const on = i === active;
                return (
                  <li key={st.title} className="relative">
                    <button
                      type="button"
                      onClick={() => goTo(i)}
                      aria-current={on ? "step" : undefined}
                      className="group grid w-full grid-cols-[2rem_1fr] items-start gap-3 py-1.5 text-left"
                    >
                      <span
                        className={`relative grid h-[1.9rem] w-[1.9rem] place-items-center rounded-full border font-mono text-[11px] transition-colors duration-300 ${
                          on ? "border-accent bg-accent text-accent-ink" : "border-line-strong bg-bg text-muted group-hover:text-ink"
                        }`}
                      >
                        {num(i)}
                      </span>
                      <span className="pt-[0.2rem]">
                        <span className={`block font-medium tracking-tight transition-colors duration-300 ${on ? "text-lg text-ink" : "text-muted group-hover:text-ink"}`}>
                          {st.title}
                        </span>
                        <motion.span
                          initial={false}
                          animate={{ height: on ? "auto" : 0, opacity: on ? 1 : 0 }}
                          transition={{ duration: reduce ? 0 : 0.5, ease }}
                          className="block overflow-hidden"
                        >
                          <StepDetail step={st} />
                          {on && extra?.(scrollYProgress, i)}
                        </motion.span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>

            {/* Phones: step rail + the active step */}
            <div className="mt-5 md:hidden">
              <div className="flex gap-1" aria-hidden>
                {ch.steps.map((st, i) => (
                  <span key={st.title} className={`h-[3px] flex-1 rounded-full transition-colors duration-300 ${i <= active ? "bg-accent" : "bg-line-strong"}`} />
                ))}
              </div>
              <div className="mt-4 min-h-[11rem]" aria-live="polite">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={active}
                    initial={reduce ? false : { opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduce ? undefined : { opacity: 0, y: -10 }}
                    transition={{ duration: 0.3, ease }}
                  >
                    <p className="font-mono text-xs text-accent">
                      {num(active)} / {step.meta}
                    </p>
                    <h3 className="mt-1.5 text-xl font-semibold tracking-tight">{step.title}</h3>
                    <StepDetail step={step} compact />
                    {extra?.(scrollYProgress, active)}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function StepDetail({ step, compact }: { step: (typeof chapters)[ChapterId]["steps"][number]; compact?: boolean }) {
  return (
    <>
      <span className="block max-w-[44ch] pt-1.5 text-sm leading-relaxed text-muted">{step.body}</span>
      {step.command && (
        <span className="mt-3 block w-fit rounded-[10px] border border-line bg-surface px-3 py-2 font-mono text-xs text-ink">
          <span className="text-accent">&gt;</span> {step.command}
        </span>
      )}
      <span className="flex items-center gap-3 pt-2.5 font-mono text-xs text-accent">
        {!compact && step.meta}
        {step.logo && <OrgLogo org={step.logo} className={`text-ink ${step.logo === "pprime" ? "h-8" : step.logo === "dassault" ? "h-5" : "h-6"}`} />}
      </span>
    </>
  );
}
