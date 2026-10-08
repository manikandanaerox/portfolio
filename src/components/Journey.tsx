"use client";

import { useRef } from "react";
import { motion, useScroll, useSpring } from "motion/react";
import { earlier, education, journey, languages, leadership, otherProjects } from "../content";
import { OrgLogo } from "./OrgLogo";
import { Reveal } from "./Reveal";

// Wordmarks are wide, Pprime's mark is tall: per-logo heights keep them optically matched.
const LOGO_HEIGHT = { dassault: "h-6", sae: "h-8", dgac: "h-9", pprime: "h-12", recon: "h-7" } as const;

/*
  Experience: the main roles on a trajectory rail that draws itself as you
  scroll; other projects, internships, leadership and education in a side column.
*/
export function Journey() {
  const list = useRef<HTMLOListElement>(null);
  const { scrollYProgress } = useScroll({ target: list, offset: ["start 70%", "end 60%"] });
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 24, mass: 0.4 });
  return (
    <section id="journey" className="relative py-24 md:py-40">
      <div className="mx-auto grid w-full max-w-[1400px] grid-cols-1 px-5 md:grid-cols-12 md:px-10">
        <div className="md:col-span-7 lg:col-span-6">
          <Reveal>
            <h2 className="display text-[2.6rem] font-semibold leading-[1] md:text-7xl lg:text-8xl">Experience.</h2>
          </Reveal>
          <ol ref={list} className="relative mt-12 pl-8 md:pl-10">
            <span aria-hidden className="absolute bottom-2 left-[3px] top-2 w-px bg-line" />
            <motion.span aria-hidden style={{ scaleY: progress }} className="absolute bottom-2 left-[3px] top-2 w-px origin-top bg-accent" />
            {journey.map((j, i) => (
              <li key={j.title} className="relative border-t border-line py-8 first:border-t-0 first:pt-0">
                <span aria-hidden className={`absolute -left-8 h-[7px] w-[7px] rounded-full border border-accent bg-bg md:-left-10 ${i === 0 ? "top-2" : "top-10"}`} />
                <Reveal delay={0.05 * i} className="grid grid-cols-1 gap-3 sm:grid-cols-[8.5rem_1fr] sm:gap-8">
                  <p className="font-mono text-sm text-accent">{j.when}</p>
                  <div>
                    <h3 className="text-xl font-semibold tracking-tight md:text-2xl">{j.title}</h3>
                    <p className="mt-1 text-sm text-muted">{j.where}</p>
                    {j.logo && <OrgLogo org={j.logo} className={`mt-4 text-ink ${LOGO_HEIGHT[j.logo]}`} />}
                    <p className="mt-3 max-w-[56ch] leading-relaxed text-muted">{j.body}</p>
                  </div>
                </Reveal>
              </li>
            ))}
          </ol>
        </div>
        <div className="mt-6 md:col-span-4 md:col-start-9 md:mt-0">
          <Reveal className="grid grid-cols-1 gap-10 border-t border-line pt-10 sm:grid-cols-2 md:grid-cols-1 md:border-t-0 md:pt-[11rem]">
            <div>
              <h3 className="font-mono text-sm text-accent">Other projects</h3>
              <ul className="mt-4 grid gap-3">
                {otherProjects.map((e) => (
                  <li key={e.title}>
                    <p className="font-medium leading-snug">{e.title}</p>
                    <p className="text-sm text-muted">
                      {e.where}, {e.when}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-mono text-sm text-accent">Earlier internships</h3>
              <ul className="mt-4 grid gap-3">
                {earlier.map((e) => (
                  <li key={e.title}>
                    <p className="font-medium leading-snug">{e.title}</p>
                    <p className="text-sm text-muted">
                      {e.where}, {e.when}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-mono text-sm text-accent">Leadership</h3>
              <ul className="mt-4 grid gap-3">
                {leadership.map((e) => (
                  <li key={e.title}>
                    <p className="font-medium leading-snug">{e.title}</p>
                    <p className="text-sm text-muted">
                      {e.where}, {e.when}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-mono text-sm text-accent">Education</h3>
              <ul className="mt-4 grid gap-3">
                {education.map((e) => (
                  <li key={e.title}>
                    <p className="font-medium leading-snug">{e.title}</p>
                    <p className="text-sm text-muted">
                      {e.where}, {e.when}
                    </p>
                  </li>
                ))}
              </ul>
              <p className="mt-5 text-sm text-muted">{languages}</p>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
