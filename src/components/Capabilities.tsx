"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useMotionValueEvent, useReducedMotion, useScroll } from "motion/react";
import { capabilities } from "../content";
import { scrollToY } from "../lib/scroll";
import { Img } from "./Img";
import { Reveal } from "./Reveal";

/*
  Systems. Desktop: the section pins and scrolling steps through the six areas;
  the list and the image panel always describe the same one. Clicking a row
  scrolls to it. Mobile / reduced motion: a plain list with every area open.
*/

const STEP_VH = 55; // scroll distance per area

export function Capabilities() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const [pinned, setPinned] = useState(false);
  const [active, setActive] = useState(0);
  const n = capabilities.length;

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const update = () => setPinned(mq.matches && !reduce);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [reduce]);

  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  useMotionValueEvent(scrollYProgress, "change", (p) => {
    if (!pinned) return;
    const i = Math.min(n - 1, Math.floor(p * n));
    if (i !== active) setActive(i);
  });

  const goTo = (i: number) => {
    const el = ref.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY;
    const travel = el.offsetHeight - window.innerHeight;
    scrollToY(top + ((i + 0.5) / n) * travel);
  };

  const heading = (
    <h2 className="display max-w-[16ch] text-[2.6rem] font-semibold leading-[1] md:text-6xl lg:text-7xl">What I work on.</h2>
  );

  if (!pinned) {
    return (
      <section id="capabilities" ref={ref} className="relative py-24">
        <div className="mx-auto w-full max-w-[1400px] px-5">
          <Reveal>{heading}</Reveal>
          <ul className="mt-12 grid gap-12">
            {capabilities.map((c) => (
              <li key={c.title}>
                <Reveal>
                  <h3 className="display text-2xl font-semibold leading-tight">{c.title}</h3>
                  <p className="mt-2 leading-relaxed text-muted">{c.body}</p>
                  <Img src={c.image} alt={c.title} sizes="100vw" className="mt-5 aspect-[4/3] rounded-[14px]" />
                </Reveal>
              </li>
            ))}
          </ul>
        </div>
      </section>
    );
  }

  return (
    <section id="capabilities" ref={ref} className="relative" style={{ height: `calc(100dvh + ${n * STEP_VH}vh)` }}>
      <div className="sticky top-0 flex h-[100dvh] flex-col justify-center overflow-hidden">
        <div className="mx-auto grid w-full max-w-[1400px] grid-cols-12 items-center gap-12 px-10 pt-16">
          <div className="col-span-7">
            {heading}
            <ul className="mt-10">
              {capabilities.map((c, i) => {
                const on = i === active;
                return (
                  <li key={c.title} className="border-t border-line last:border-b">
                    <button type="button" onClick={() => goTo(i)} aria-current={on} className="group grid w-full grid-cols-[1fr_auto] items-baseline gap-4 py-4 text-left">
                      <span
                        className={`display text-xl font-semibold leading-tight transition-colors duration-300 lg:text-[1.7rem] ${on ? "text-ink" : "text-muted/70 group-hover:text-ink"}`}
                      >
                        {c.title}
                      </span>
                      <span aria-hidden className={`h-2.5 w-2.5 rounded-[3px] transition-all duration-300 ${on ? "rotate-45 bg-accent" : "bg-line-strong"}`} />
                      <motion.span
                        initial={false}
                        animate={{ height: on ? "auto" : 0, opacity: on ? 1 : 0 }}
                        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                        className="col-span-2 block overflow-hidden"
                      >
                        <span className="block max-w-[54ch] pt-2 leading-relaxed text-muted">{c.body}</span>
                      </motion.span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="col-span-5">
            <div className="relative aspect-[4/5] max-h-[68dvh] overflow-hidden rounded-[18px] border border-line bg-surface">
              <AnimatePresence initial={false}>
                <motion.div
                  key={active}
                  initial={{ opacity: 0, scale: 1.05 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                  className="absolute inset-0"
                >
                  <Img src={capabilities[active].image} alt={capabilities[active].title} sizes="40vw" className="absolute inset-0" />
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
