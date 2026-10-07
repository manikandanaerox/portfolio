"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { ArrowUpRightIcon } from "@phosphor-icons/react";
import { projects } from "../content";
import { Img } from "./Img";

type Project = (typeof projects)[number];

function ProjectCard({ p }: { p: Project }) {
  return (
    <article className="group flex w-full shrink-0 flex-col md:w-[min(64vw,880px)]">
      <Img
        src={p.image}
        alt={`${p.title} project`}
        sizes="(min-width: 768px) 64vw, 100vw"
        className="aspect-[16/10] rounded-[18px] border border-line md:aspect-auto md:h-[min(48dvh,520px)]"
      />
      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-[1fr_auto] md:items-start md:gap-10">
        <div>
          <h3 className="display text-2xl font-semibold leading-tight md:text-[2rem]">{p.title}</h3>
          <p className="mt-3 max-w-[50ch] leading-relaxed text-muted">{p.summary}</p>
          <ul className="mt-5 flex flex-wrap gap-2">
            {p.tags.map((t) => (
              <li key={t} className="rounded-[8px] border border-line-strong px-2.5 py-1 font-mono text-xs text-muted">
                {t}
              </li>
            ))}
          </ul>
        </div>
        <a
          href={p.href}
          className="inline-flex w-fit items-center gap-2 whitespace-nowrap rounded-[10px] border border-line-strong px-4 py-2.5 text-sm font-semibold transition-colors duration-300 hover:border-accent hover:text-accent"
        >
          Case study
          <ArrowUpRightIcon size={15} weight="bold" />
        </a>
      </div>
    </article>
  );
}

/*
  Desktop: the section pins and vertical scroll pans the row of projects
  sideways (start "start start", travel = track width minus viewport).
  Mobile and reduced motion: a plain vertical list.
*/
export function Projects() {
  const section = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const [distance, setDistance] = useState(0);
  const [pan, setPan] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const measure = () => {
      const on = mq.matches && !reduce;
      setPan(on);
      if (on && track.current) setDistance(Math.max(0, track.current.scrollWidth - window.innerWidth));
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (track.current) ro.observe(track.current);
    mq.addEventListener("change", measure);
    return () => {
      ro.disconnect();
      mq.removeEventListener("change", measure);
    };
  }, [reduce]);

  const { scrollYProgress } = useScroll({ target: section, offset: ["start start", "end end"] });
  const x = useTransform(scrollYProgress, [0, 1], [0, -distance]);

  return (
    <section
      id="projects"
      ref={section}
      className="relative"
      style={pan ? { height: `calc(100dvh + ${distance}px)` } : undefined}
    >
      <div className={pan ? "sticky top-0 flex h-[100dvh] flex-col justify-center overflow-hidden pt-16" : "py-24"}>
        <div className="mx-auto w-full max-w-[1400px] px-5 md:px-10">
          <p className="font-mono text-xs text-accent">Selected work</p>
          <h2 className="display mt-3 text-4xl font-semibold leading-[1.02] md:text-5xl">Aircraft I have built and flown.</h2>
        </div>
        <motion.div
          ref={track}
          style={pan ? { x } : undefined}
          className={`mt-10 flex gap-8 px-5 md:mt-12 md:w-max md:gap-12 md:px-10 ${pan ? "" : "flex-col"}`}
        >
          {projects.map((p) => (
            <ProjectCard key={p.title} p={p} />
          ))}
          {pan && <div aria-hidden className="w-[6vw] shrink-0" />}
        </motion.div>
      </div>
    </section>
  );
}
