"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform, type MotionValue } from "motion/react";
import {
  RocketLaunchIcon, UserIcon, FlameIcon, FanIcon, DroneIcon, PathIcon, PaperPlaneTiltIcon, SunIcon, MoonIcon,
  type Icon,
} from "@phosphor-icons/react";
import { SECTION_IDS, type SectionId } from "../lib/stage";
import { scrollToId } from "../lib/scroll";
import { setTheme, useTheme } from "../lib/theme";

const ITEMS: { id: SectionId; label: string; icon: Icon }[] = [
  { id: "home", label: "Launch", icon: RocketLaunchIcon },
  { id: "about", label: "About", icon: UserIcon },
  { id: "rocket", label: "Propulsion", icon: FlameIcon },
  { id: "propulsion", label: "ATREX study", icon: FanIcon },
  { id: "uav", label: "UAV", icon: DroneIcon },
  { id: "journey", label: "Experience", icon: PathIcon },
  { id: "contact", label: "Contact", icon: PaperPlaneTiltIcon },
];

function useActiveSection() {
  const [active, setActive] = useState<SectionId>("home");
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(e.target.id as SectionId);
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    SECTION_IDS.forEach((id) => {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    });
    return () => io.disconnect();
  }, []);
  return active;
}

/** macOS-style magnification: size follows pointer distance along the dock. */
function DockButton({
  mouseX, label, active, onClick, children,
}: { mouseX: MotionValue<number>; label: string; active?: boolean; onClick: () => void; children: React.ReactNode }) {
  const ref = useRef<HTMLButtonElement>(null);
  const reduce = useReducedMotion();
  const distance = useTransform(mouseX, (x) => {
    const r = ref.current?.getBoundingClientRect();
    return r ? x - (r.left + r.width / 2) : Infinity;
  });
  const sizeRaw = useTransform(distance, [-120, 0, 120], [40, reduce ? 40 : 54, 40]);
  const size = useSpring(sizeRaw, { stiffness: 260, damping: 22, mass: 0.4 });

  return (
    <motion.button
      ref={ref}
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-current={active ? "true" : undefined}
      style={{ width: size, height: size }}
      className={`group relative grid shrink-0 place-items-center rounded-[10px] transition-colors duration-300 active:scale-95 max-md:!h-9 max-md:!w-9 ${
        active ? "text-accent-ink" : "text-muted hover:text-ink"
      }`}
    >
      {active && (
        <motion.span
          layoutId="dock-active"
          className="absolute inset-0 rounded-[10px] bg-accent"
          transition={{ type: "spring", stiffness: 380, damping: 32 }}
        />
      )}
      <span className="relative">{children}</span>
      <span className="pointer-events-none absolute top-full mt-3 hidden whitespace-nowrap rounded-[8px] border border-line bg-surface px-2.5 py-1 font-mono text-[11px] text-ink opacity-0 shadow-sm transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100 md:block md:-translate-y-1">
        {label}
      </span>
    </motion.button>
  );
}

export function Dock() {
  const active = useActiveSection();
  const theme = useTheme();
  const mouseX = useMotionValue(Infinity);
  const reduce = useReducedMotion();

  return (
    <motion.nav
      aria-label="Sections"
      initial={reduce ? false : { opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 1, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="fixed inset-x-0 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-40 flex justify-center px-3 md:bottom-auto md:top-5"
    >
      <div
        onMouseMove={(e) => mouseX.set(e.clientX)}
        onMouseLeave={() => mouseX.set(Infinity)}
        className="glass glass-solid flex items-center gap-0.5 rounded-[14px] p-1.5 md:gap-1"
      >
        {ITEMS.map(({ id, label, icon: I }) => (
          <DockButton key={id} mouseX={mouseX} label={label} active={active === id} onClick={() => scrollToId(id)}>
            <I size={19} weight={active === id ? "fill" : "regular"} />
          </DockButton>
        ))}
        <span className="mx-1 h-6 w-px bg-line-strong" aria-hidden />
        <DockButton
          mouseX={mouseX}
          label={theme === "dark" ? "Light mode" : "Dark mode"}
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          <motion.span key={theme} initial={reduce ? false : { rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} className="block">
            {theme === "dark" ? <SunIcon size={19} /> : <MoonIcon size={19} />}
          </motion.span>
        </DockButton>
      </div>
    </motion.nav>
  );
}
