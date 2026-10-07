"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "motion/react";
import { fleetScreen } from "@/lib/fleetScreen";

/*
  Rotor downwash on text.
  Letters below a hovering aircraft are pushed down and outward and shake in
  the turbulence, then spring back once it leaves. Strength follows the live
  rotor output and distance; the wash column widens below the aircraft.
  Pure transforms on per-letter spans, one rAF loop, idle when nothing is near.
*/

type Letter = { el: HTMLSpanElement; cx: number; cy: number; x: number; y: number; r: number; vx: number; vy: number; vr: number };

type Part = { text: string; className?: string };

export function Downwash({ parts, className = "" }: { parts: Part[]; className?: string }) {
  const root = useRef<HTMLSpanElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    const host = root.current;
    if (!host || reduce) return;
    const spans = Array.from(host.querySelectorAll<HTMLSpanElement>("[data-l]"));
    let letters: Letter[] = [];

    // Letter centres relative to the host, measured with transforms cleared.
    const measure = () => {
      spans.forEach((s) => (s.style.transform = ""));
      const hr = host.getBoundingClientRect();
      letters = spans.map((el) => {
        const r = el.getBoundingClientRect();
        return { el, cx: r.left - hr.left + r.width / 2, cy: r.top - hr.top + r.height / 2, x: 0, y: 0, r: 0, vx: 0, vy: 0, vr: 0 };
      });
    };
    measure();
    document.fonts?.ready.then(measure);
    window.addEventListener("resize", measure);

    let raf = 0;
    let last = performance.now();
    let resting = true;
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      const hr = host.getBoundingClientRect();
      if (hr.bottom < -200 || hr.top > window.innerHeight + 200) return;

      // Only aircraft close enough to the text block matter.
      const near = [...fleetScreen.values()].filter(
        (a) => a.power > 0.05 && a.x > hr.left - a.r * 2 && a.x < hr.right + a.r * 2 && a.y < hr.bottom + a.r && a.y > hr.top - a.r * 4,
      );
      if (!near.length && resting) return;

      const t = now / 1000;
      let moving = false;
      for (const L of letters) {
        let tx = 0;
        let ty = 0;
        let tr = 0;
        for (const a of near) {
          const lx = hr.left + L.cx;
          const ly = hr.top + L.cy;
          const dx = lx - a.x;
          const dy = ly - a.y;
          if (dy < -a.r * 0.25 || dy > a.r * 2.4) continue; // wash only goes down, and only so far
          const width = a.r * (0.9 + Math.max(0, dy) / (a.r * 2.2)); // column spreads as it falls
          const across = 1 - Math.abs(dx) / width;
          if (across <= 0) continue;
          const fall = Math.exp(-Math.max(0, dy) / (a.r * 1.1));
          const k = a.power * across * across * fall;
          const side = Math.sign(dx) || 1;
          // Turbulence: fast, uneven buffeting per letter.
          const buffet = Math.sin(t * 23 + L.cx * 0.13) * 0.5 + Math.sin(t * 37 + L.cx * 0.07) * 0.5;
          ty += k * (16 + buffet * 5);
          tx += k * side * (9 * (1 - across) + 3) + k * buffet * 2;
          tr += k * side * (7 + buffet * 3);
        }
        // Critically-damped springs toward the wash target.
        const ks = 180;
        const kd = 2 * Math.sqrt(ks);
        L.vx += (ks * (tx - L.x) - kd * L.vx) * dt;
        L.vy += (ks * (ty - L.y) - kd * L.vy) * dt;
        L.vr += (ks * (tr - L.r) - kd * L.vr) * dt;
        L.x += L.vx * dt;
        L.y += L.vy * dt;
        L.r += L.vr * dt;
        if (Math.abs(L.x) + Math.abs(L.y) + Math.abs(L.r) > 0.05 || Math.abs(L.vy) > 0.05) moving = true;
        L.el.style.transform = `translate3d(${L.x.toFixed(2)}px, ${L.y.toFixed(2)}px, 0) rotate(${L.r.toFixed(2)}deg)`;
      }
      resting = !moving && !near.length;
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", measure);
      spans.forEach((s) => (s.style.transform = ""));
    };
  }, [reduce]);

  // Words stay unbreakable; each letter is its own transform target. Screen readers get the plain string.
  let i = 0;
  return (
    <span ref={root} className={className}>
      <span className="sr-only">{parts.map((p) => p.text).join(" ")}</span>
      {parts.map((p, pi) => (
        <span key={pi} aria-hidden className={p.className}>
          {p.text.split(" ").map((word, wi, words) => (
            <span key={wi} className="inline-block whitespace-nowrap">
              {[...word].map((ch) => (
                <span key={i++} data-l className="inline-block will-change-transform">
                  {ch}
                </span>
              ))}
              {(wi < words.length - 1 || pi < parts.length - 1) && <span className="inline-block">&nbsp;</span>}
            </span>
          ))}
        </span>
      ))}
    </span>
  );
}
