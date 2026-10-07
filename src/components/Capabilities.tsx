"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { capabilities } from "../content";
import { Img } from "./Img";
import { Reveal } from "./Reveal";

/*
  Systems list. Hovering or focusing a row expands it and swaps the image
  panel on the right, so the list and the picture always describe the same thing.
*/
export function Capabilities() {
  const [active, setActive] = useState(0);
  const reduce = useReducedMotion();

  return (
    <section id="capabilities" className="relative py-24 md:py-36">
      <div className="mx-auto w-full max-w-[1400px] px-5 md:px-10">
        <Reveal>
          <h2 className="display max-w-[14ch] text-[2.6rem] font-semibold leading-[1] md:text-7xl lg:text-8xl">The whole aircraft, end to end.</h2>
        </Reveal>

        <div className="mt-14 grid grid-cols-1 gap-10 md:mt-20 md:grid-cols-12 md:gap-12">
          <ul className="md:col-span-7">
            {capabilities.map((c, i) => {
              const on = i === active;
              return (
                <li key={c.title} className="border-t border-line last:border-b">
                  <button
                    type="button"
                    onMouseEnter={() => setActive(i)}
                    onFocus={() => setActive(i)}
                    onClick={() => setActive(i)}
                    aria-expanded={on}
                    className="group grid w-full grid-cols-[1fr_auto] items-baseline gap-4 py-6 text-left md:py-7"
                  >
                    <span
                      className={`display text-2xl font-semibold leading-tight transition-colors duration-300 md:text-[2.1rem] ${on ? "text-ink" : "text-muted group-hover:text-ink"}`}
                    >
                      {c.title}
                    </span>
                    <span
                      aria-hidden
                      className={`h-2.5 w-2.5 rounded-[3px] transition-all duration-300 ${on ? "rotate-45 bg-accent" : "bg-line-strong"}`}
                    />
                    <motion.span
                      initial={false}
                      animate={{ height: on ? "auto" : 0, opacity: on ? 1 : 0 }}
                      transition={{ duration: reduce ? 0 : 0.45, ease: [0.16, 1, 0.3, 1] }}
                      className="col-span-2 block overflow-hidden"
                    >
                      <span className="block max-w-[52ch] pt-3 leading-relaxed text-muted">{c.body}</span>
                      {/* Mobile shows the picture inline; desktop uses the side panel. */}
                      <Img src={c.image} alt="" sizes="100vw" className="mt-5 aspect-[4/3] rounded-[14px] md:hidden" />
                    </motion.span>
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="hidden md:col-span-5 md:block">
            <div className="sticky top-28 aspect-[4/5] overflow-hidden rounded-[18px] border border-line bg-surface">
              <AnimatePresence initial={false}>
                <motion.div
                  key={active}
                  initial={reduce ? false : { opacity: 0, scale: 1.04 }}
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
