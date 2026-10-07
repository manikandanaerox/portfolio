"use client";

import { motion, useReducedMotion, type Variants } from "motion/react";
import { ArrowRightIcon } from "@phosphor-icons/react";
import { hero, profile } from "../content";
import { scrollToId } from "../lib/scroll";
import { Img } from "./Img";

const ease = [0.16, 1, 0.3, 1] as const;

/** Viewfinder brackets: they close in on the portrait like a camera acquiring focus. */
function Viewfinder({ reduce }: { reduce: boolean | null }) {
  const corners = [
    "left-0 top-0 border-l-2 border-t-2 rounded-tl-[6px]",
    "right-0 top-0 border-r-2 border-t-2 rounded-tr-[6px]",
    "left-0 bottom-0 border-l-2 border-b-2 rounded-bl-[6px]",
    "right-0 bottom-0 border-r-2 border-b-2 rounded-br-[6px]",
  ];
  return (
    <motion.div
      aria-hidden
      className="pointer-events-none absolute -inset-3 md:-inset-4"
      initial={reduce ? false : { scale: 1.12, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 1.1, delay: 0.55, ease }}
    >
      {corners.map((c) => (
        <span key={c} className={`absolute h-6 w-6 border-accent md:h-7 md:w-7 ${c}`} />
      ))}
    </motion.div>
  );
}

/*
  Centred hero: the portrait is the subject, the headline flanks it, and the
  WebGL aircraft hovers above with its gimbal camera aimed down at the face.
*/
export function Hero() {
  const reduce = useReducedMotion();
  const container: Variants = { show: { transition: { staggerChildren: 0.1, delayChildren: 0.2 } } };
  const item: Variants = {
    hidden: reduce ? {} : { opacity: 0, y: 24 },
    show: { opacity: 1, y: 0, transition: { duration: 1, ease } },
  };

  return (
    <section id="home" className="relative flex min-h-[100dvh] flex-col justify-end pb-8 pt-[24dvh] md:pb-12 md:pt-[25dvh]">
      <motion.div variants={container} initial="hidden" animate="show" className="mx-auto w-full max-w-[1400px] px-5 md:px-10">
        <div className="grid grid-cols-1 items-center justify-items-center gap-6 md:grid-cols-[1fr_auto_1fr] md:gap-12">
          {/* Portrait */}
          <motion.div
            variants={item}
            className="relative order-first aspect-[4/5] h-[31dvh] md:order-none md:col-start-2 md:row-start-1 md:h-[clamp(13rem,40dvh,25rem)]"
          >
            <Img
              src={profile.photo}
              alt={`Portrait of ${profile.name}`}
              priority
              sizes="(min-width: 768px) 320px, 60vw"
              position="50% 32%"
              className="absolute inset-0 rounded-[18px] ring-1 ring-line-strong"
            />
            <Viewfinder reduce={reduce} />
          </motion.div>

          {/* Headline split around the portrait on desktop, stacked under it on mobile */}
          <h1 className="contents">
            <motion.span
              variants={item}
              className="display block text-center text-[2.4rem] font-semibold leading-[1] sm:text-5xl md:col-start-1 md:row-start-1 md:justify-self-end md:text-right md:text-[clamp(2.5rem,4.6vw,4.6rem)]"
            >
              {hero.headlineStart}
            </motion.span>
            <motion.span
              variants={item}
              className="display -mt-4 block text-center text-[2.4rem] font-semibold leading-[1] text-accent sm:text-5xl md:col-start-3 md:row-start-1 md:mt-0 md:justify-self-start md:text-left md:text-[clamp(2.5rem,4.6vw,4.6rem)]"
            >
              {hero.headlineEmphasis}
            </motion.span>
          </h1>
        </div>

        {/* Identity, one line of copy, actions: centred under the portrait */}
        <motion.div variants={item} className="mt-8 flex flex-col items-center text-center md:mt-10">
          <p className="text-xl font-semibold tracking-tight md:text-2xl">
            {profile.name}
            <span className="ml-3 font-mono text-xs font-normal text-accent md:text-sm">{profile.role}</span>
          </p>
          <p className="mt-3 max-w-[48ch] leading-relaxed text-muted md:text-lg">{hero.sub}</p>
        </motion.div>

        <motion.div variants={item} className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => scrollToId("projects")}
            className="group inline-flex items-center gap-2.5 whitespace-nowrap rounded-[10px] bg-accent px-5 py-3.5 text-sm font-semibold text-accent-ink transition-transform duration-300 ease-out-expo hover:-translate-y-0.5 active:translate-y-px"
          >
            View projects
            <ArrowRightIcon size={16} weight="bold" className="transition-transform duration-300 group-hover:translate-x-1" />
          </button>
          <button
            type="button"
            onClick={() => scrollToId("contact")}
            className="inline-flex items-center whitespace-nowrap rounded-[10px] border border-line-strong bg-glass px-5 py-3.5 text-sm font-semibold text-ink backdrop-blur-md transition-colors duration-300 hover:border-ink active:translate-y-px"
          >
            Contact
          </button>
        </motion.div>
      </motion.div>
    </section>
  );
}
