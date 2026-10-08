"use client";

import { useEffect, useRef } from "react";
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform, type Variants } from "motion/react";
import { FileTextIcon, GithubLogoIcon, LinkedinLogoIcon, type Icon } from "@phosphor-icons/react";
import { hero, profile } from "../content";
import { heroFrame } from "../lib/heroFrame";
import { Downwash } from "./Downwash";
import { Img } from "./Img";

/*
  Opening shot: "Airframe".
  The portrait sits in a clean centred frame. The inspection drone hovers
  directly behind it (WebGL canvas is below the DOM), so the frame covers the
  body and the face is never touched, while the four arms and spinning rotors
  reach out past the frame's corners. The person is the centre of the aircraft.
*/

const ease = [0.16, 1, 0.3, 1] as const;

const SOCIAL_ICONS: Record<string, Icon> = { GitHub: GithubLogoIcon, LinkedIn: LinkedinLogoIcon };
const ICON_LINK =
  "grid h-12 w-12 place-items-center rounded-[12px] border border-line text-ink transition duration-300 ease-out-expo hover:-translate-y-0.5 hover:border-accent hover:text-accent active:translate-y-px";

/** Gentle 3D tilt of the frame toward the pointer (off for reduced motion and touch). */
function usePointerTilt() {
  const reduce = useReducedMotion();
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  useEffect(() => {
    if (reduce || !window.matchMedia("(pointer: fine)").matches) return;
    const onMove = (e: PointerEvent) => {
      px.set(e.clientX / window.innerWidth - 0.5);
      py.set(e.clientY / window.innerHeight - 0.5);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [reduce, px, py]);
  const spring = { stiffness: 120, damping: 18, mass: 0.6 };
  const rotateY = useSpring(useTransform(px, [-0.5, 0.5], [-7, 7]), spring);
  const rotateX = useSpring(useTransform(py, [-0.5, 0.5], [6, -6]), spring);
  return { rotateX, rotateY };
}

const CORNERS = [
  "left-0 top-0 border-l-2 border-t-2 rounded-tl-[6px]",
  "right-0 top-0 border-r-2 border-t-2 rounded-tr-[6px]",
  "left-0 bottom-0 border-l-2 border-b-2 rounded-bl-[6px]",
  "right-0 bottom-0 border-r-2 border-b-2 rounded-br-[6px]",
];

export function Hero() {
  const reduce = useReducedMotion();
  const tilt = usePointerTilt();
  const frameRef = useRef<HTMLDivElement>(null);
  // The flight model reads this element's rect every frame and keeps the drone out of it.
  useEffect(() => {
    heroFrame.el = frameRef.current;
    return () => {
      heroFrame.el = null;
    };
  }, []);
  const container: Variants = { show: { transition: { staggerChildren: 0.1, delayChildren: 0.35 } } };
  const item: Variants = {
    hidden: reduce ? {} : { opacity: 0, y: 22 },
    show: { opacity: 1, y: 0, transition: { duration: 1, ease } },
  };

  return (
    <section id="home" className="relative flex min-h-[100dvh] flex-col items-center justify-center px-5 pb-24 pt-[9dvh] md:pb-12 md:pt-[11dvh]">
      {/* Portrait frame */}
      <div ref={frameRef} style={{ perspective: 1200 }}>
        <motion.div
          initial={reduce ? false : { opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.2, ease }}
          style={{ rotateX: tilt.rotateX, rotateY: tilt.rotateY, transformStyle: "preserve-3d" }}
          className="relative aspect-[4/5] h-[clamp(13rem,31dvh,28rem)] md:h-[clamp(17rem,43dvh,32rem)]"
        >
          <Img
            src={profile.photo}
            alt={`Portrait of ${profile.name}`}
            priority
            sizes="(min-width: 768px) 440px, 70vw"
            position={profile.photoPosition}
            className="absolute inset-0 rounded-[18px] shadow-[0_40px_80px_-30px_rgb(0_0_0/0.65)] ring-1 ring-line-strong"
          />
          {/* Viewfinder brackets close in like the payload camera acquiring focus */}
          <motion.div
            aria-hidden
            className="pointer-events-none absolute -inset-3.5 md:-inset-4"
            initial={reduce ? false : { scale: 1.14, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 1.1, delay: 0.7, ease }}
          >
            {CORNERS.map((c) => (
              <span key={c} className={`absolute h-7 w-7 border-accent ${c}`} />
            ))}
          </motion.div>
        </motion.div>
      </div>

      {/* Identity, headline, actions */}
      <motion.div variants={container} initial="hidden" animate="show" className="mt-8 flex flex-col items-center text-center md:mt-9">
        <motion.p variants={item} className="text-base font-semibold tracking-tight md:text-xl">
          {profile.name}
          <span className="mt-1 block font-mono text-xs font-normal text-accent md:ml-3 md:mt-0 md:inline md:text-sm">{profile.role}</span>
        </motion.p>
        <motion.h1
          variants={item}
          className="display mt-3 max-w-[18ch] text-[2.3rem] font-semibold leading-[1] sm:text-5xl md:max-w-none md:text-[clamp(2.6rem,4.1vw,4.4rem)]"
        >
          {/* Letters react to the rotor downwash of the drone surveying above them. */}
          <Downwash parts={[{ text: hero.headlineStart }, { text: hero.headlineEmphasis, className: "text-accent" }]} />
        </motion.h1>
        <motion.p variants={item} className="mt-4 max-w-[52ch] text-sm leading-relaxed text-muted md:text-lg">
          {hero.sub}
        </motion.p>
        <motion.div variants={item} className="mt-7 flex flex-wrap items-center justify-center gap-3">
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
    </section>
  );
}
