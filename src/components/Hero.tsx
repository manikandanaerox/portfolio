"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion, useMotionValueEvent, useReducedMotion, useScroll, useTransform, type Variants } from "motion/react";
import { FileTextIcon, GithubLogoIcon, LinkedinLogoIcon, type Icon } from "@phosphor-icons/react";
import { hero, launch, profile } from "../content";
import { Img } from "./Img";

/*
  Opening shot: a launch, scrubbed by scroll. The section pins for several
  screens while the WebGL hero act (three/acts/Launch) runs the sequence:
  venting on the pad, ignition, liftoff, ascent, booster separation.
  The headline sits over the pad and clears as the engines light; a caption
  names each launch event as it happens.
*/

const ease = [0.16, 1, 0.3, 1] as const;

const SOCIAL_ICONS: Record<string, Icon> = { GitHub: GithubLogoIcon, LinkedIn: LinkedinLogoIcon };
/**
 * Portrait as an editorial vignette: black and white, cropped to head and
 * shoulders, its edges dissolving into the night (radial mask) instead of a frame.
 */
const VIGNETTE = "radial-gradient(ellipse 46% 52% at 52% 40%, #000 38%, transparent 74%)";
// Darkens the bright background around the head so only the subject emerges (page colour, so it works in both themes).
const SHADE = "radial-gradient(ellipse 34% 40% at 53% 36%, transparent 45%, color-mix(in srgb, var(--bg) 82%, transparent) 100%)";
function Portrait({ className }: { className: string }) {
  return (
    <div className={`relative shrink-0 ${className}`} style={{ maskImage: VIGNETTE, WebkitMaskImage: VIGNETTE }}>
      <Img
        src={profile.photo}
        alt={`Portrait of ${profile.name}`}
        priority
        sizes="(min-width: 768px) 320px, 120px"
        position="55% 20%"
        className="h-full w-full bg-transparent [&_img]:brightness-[0.92] [&_img]:contrast-[1.15] [&_img]:grayscale"
      />
      <div aria-hidden className="absolute inset-0" style={{ background: SHADE }} />
    </div>
  );
}

const ICON_LINK =
  "grid h-12 w-12 place-items-center rounded-[12px] border border-line-strong bg-bg/40 text-ink backdrop-blur-sm transition duration-300 ease-out-expo hover:-translate-y-0.5 hover:border-accent hover:text-accent active:translate-y-px";

export function Hero() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const introOpacity = useTransform(scrollYProgress, [0, 0.06, 0.13], [1, 1, 0]);
  const introY = useTransform(scrollYProgress, [0, 0.13], [0, -48]);
  const [event, setEvent] = useState(-1);

  useMotionValueEvent(scrollYProgress, "change", (p) => {
    let i = -1;
    if (p > 0.09) launch.forEach((e, k) => p >= e.at && (i = k));
    if (i !== event) setEvent(i);
  });

  const container: Variants = { show: { transition: { staggerChildren: 0.1, delayChildren: 0.3 } } };
  const item: Variants = {
    hidden: reduce ? {} : { opacity: 0, y: 22 },
    show: { opacity: 1, y: 0, transition: { duration: 1, ease } },
  };

  return (
    <section id="home" ref={ref} className="relative" style={{ height: "calc(100dvh + 320vh)" }}>
      <div id="home-stage" className="sticky top-0 h-[100dvh] overflow-hidden">
        {/* Legibility scrim under the headline */}
        <motion.div
          aria-hidden
          style={{ opacity: introOpacity }}
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[62%] bg-gradient-to-t from-bg via-bg/75 to-transparent md:inset-y-0 md:left-0 md:right-auto md:h-auto md:w-[58%] md:bg-gradient-to-r"
        />

        <motion.div style={{ opacity: introOpacity, y: introY }} className="relative mx-auto flex h-full w-full max-w-[1400px] flex-col justify-end px-5 pb-24 md:justify-center md:px-10 md:pb-0">
          <motion.div variants={container} initial="hidden" animate="show" className="max-w-[40rem]">
            {/* Desktop: the portrait heads the column */}
            <motion.div variants={item} className="-mb-[8dvh] -ml-[4.5rem] hidden md:block">
              <Portrait className="aspect-[4/5] h-[clamp(12rem,42dvh,26rem)]" />
            </motion.div>
            <motion.div variants={item} className="relative flex items-center gap-3">
              {/* Phones: a small framed portrait beside the name */}
              <Portrait className="-my-6 -ml-5 aspect-[4/5] w-[7.5rem] md:hidden" />
              <p className="text-base font-semibold tracking-tight md:text-xl">
                {profile.name}
                <span className="mt-1 block font-mono text-xs font-normal text-accent md:text-sm">{profile.role}</span>
              </p>
            </motion.div>
            <motion.h1 variants={item} className="display mt-4 text-[2.6rem] font-semibold leading-[1] md:text-[clamp(2.8rem,6.6dvh,3.75rem)] lg:text-[clamp(3rem,7.4dvh,4.6rem)]">
              {hero.headlineStart} <span className="text-accent">{hero.headlineEmphasis}</span>
            </motion.h1>
            <motion.p variants={item} className="mt-5 max-w-[46ch] text-sm leading-relaxed text-muted md:text-lg">
              {hero.sub}
            </motion.p>
            <motion.div variants={item} className="mt-7 flex flex-wrap items-center gap-3">
              <a href={profile.cv} target="_blank" rel="noreferrer" aria-label="Open CV (PDF)" title="CV" className={ICON_LINK}>
                <FileTextIcon size={22} weight="regular" />
              </a>
              {profile.socials.map((s) => {
                const I = SOCIAL_ICONS[s.label];
                return (
                  <a key={s.label} href={s.href} target="_blank" rel="noreferrer" aria-label={s.label} title={s.label} className={ICON_LINK}>
                    {I && <I size={22} />}
                  </a>
                );
              })}
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Launch events, named as they happen */}
        <div aria-live="polite" className="pointer-events-none absolute bottom-24 left-5 md:bottom-10 md:left-10">
          <AnimatePresence mode="wait">
            {event >= 0 && (
              <motion.p
                key={event}
                initial={reduce ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? undefined : { opacity: 0, y: -8 }}
                transition={{ duration: 0.35, ease }}
                className="font-mono text-xs text-ink md:text-sm"
              >
                <span className="text-accent">{String(event + 1).padStart(2, "0")}</span>
                <span className="ml-3">{launch[event].label}</span>
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
