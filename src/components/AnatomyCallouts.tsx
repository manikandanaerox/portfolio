"use client";

import { useEffect, useRef } from "react";
import { anatomy } from "../content";
import { partScreen } from "../lib/partScreen";

/*
  Exploded-view drawing overlay: a numbered balloon per part, tied to the part
  on the WebGL drone by a leader line, like the callouts on an assembly drawing.
  Positions come from the 3D model every frame (lib/partScreen) and are written
  straight to the SVG, so React only re-renders when the active part changes.
*/

const R = 13; // balloon radius, px

type Props = {
  active: number; // index into `anatomy`, -1 = none yet
  section: React.RefObject<HTMLElement | null>;
  bound: React.RefObject<HTMLElement | null>; // desktop text column: balloons stay right of it
};

export function AnatomyCallouts({ active, section, bound }: Props) {
  const svg = useRef<SVGSVGElement>(null);
  const label = useRef<HTMLDivElement>(null);
  const activeRef = useRef(active);
  activeRef.current = active;

  useEffect(() => {
    const el = section.current;
    if (!el) return;
    let raf = 0;
    let running = false;
    const pos = anatomy.map(() => ({ ax: 0, ay: 0, bx: 0, by: 0, ok: false }));

    const tick = () => {
      raf = requestAnimationFrame(tick);
      const s = svg.current;
      if (!s) return;
      const fresh = partScreen.on && performance.now() - partScreen.t < 400;
      s.style.opacity = fresh ? "1" : "0";
      if (label.current) label.current.style.opacity = fresh && activeRef.current >= 0 ? "1" : "0";
      if (!fresh) return;

      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const mobile = vw < 768;
      const reach = mobile ? 34 : 64;
      const left = mobile ? 20 : Math.max(24, (bound.current?.getBoundingClientRect().right ?? 0) + 32);
      const top = mobile ? 20 : 96; // desktop dock sits at the top
      // Phones: the part card covers the lower half, so balloons stay above it.
      const bottom = mobile ? vh * 0.56 : vh - 32;

      // Balloon = anchor pushed outward from the drone's centre, kept on screen.
      anatomy.forEach((part, i) => {
        const a = partScreen.pts.get(part.key);
        const p = pos[i];
        p.ok = !!a;
        if (!a) return;
        let dx = a.x - partScreen.cx;
        let dy = a.y - partScreen.cy;
        const len = Math.hypot(dx, dy) || 1;
        dx /= len;
        dy /= len;
        p.ax = a.x;
        p.ay = a.y;
        p.bx = a.x + dx * reach;
        p.by = a.y + dy * reach;
      });
      // Relax overlapping balloons apart, then clamp into the free area.
      const min = R * 2 + 10;
      for (let it = 0; it < 6; it++) {
        for (let i = 0; i < pos.length; i++)
          for (let j = i + 1; j < pos.length; j++) {
            const a = pos[i], b = pos[j];
            if (!a.ok || !b.ok) continue;
            let dx = b.bx - a.bx, dy = b.by - a.by;
            const d = Math.hypot(dx, dy);
            if (d >= min) continue;
            if (d < 1e-3) (dx = 1), (dy = 0);
            const k = (min - d) / 2 / (d || 1);
            a.bx -= dx * k; a.by -= dy * k;
            b.bx += dx * k; b.by += dy * k;
          }
        for (const p of pos) {
          p.bx = Math.min(vw - 20 - R, Math.max(left + R, p.bx));
          p.by = Math.min(bottom - R, Math.max(top + R, p.by));
        }
      }

      const act = activeRef.current;
      const groups = s.children;
      pos.forEach((p, i) => {
        const g = groups[i] as SVGGElement | undefined;
        if (!g) return;
        // Phones show only the active callout; desktop shows the whole drawing.
        const show = p.ok && (!mobile || i === act);
        g.style.display = show ? "" : "none";
        if (!show) return;
        const [line, dot, ring, num] = g.children as unknown as [SVGLineElement, SVGCircleElement, SVGCircleElement, SVGTextElement];
        const r = i === act ? R + 3 : R;
        // Line stops at the balloon's rim.
        const dx = p.ax - p.bx, dy = p.ay - p.by;
        const d = Math.hypot(dx, dy) || 1;
        line.setAttribute("x1", String(p.bx + (dx / d) * r));
        line.setAttribute("y1", String(p.by + (dy / d) * r));
        line.setAttribute("x2", String(p.ax));
        line.setAttribute("y2", String(p.ay));
        dot.setAttribute("cx", String(p.ax));
        dot.setAttribute("cy", String(p.ay));
        ring.setAttribute("cx", String(p.bx));
        ring.setAttribute("cy", String(p.by));
        ring.setAttribute("r", String(r));
        num.setAttribute("x", String(p.bx));
        num.setAttribute("y", String(p.by));
      });

      // Name tag beside the active balloon, on the side facing away from the drone.
      const lp = act >= 0 ? pos[act] : null;
      if (label.current && lp?.ok) {
        const rightSide = lp.bx >= partScreen.cx;
        const w = label.current.offsetWidth;
        let x = rightSide ? lp.bx + R + 10 : lp.bx - R - 10 - w;
        x = Math.min(vw - 12 - w, Math.max(12, x));
        label.current.style.transform = `translate3d(${x}px, ${lp.by - label.current.offsetHeight / 2}px, 0)`;
      }
    };

    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !running) {
        running = true;
        tick();
      } else if (!e.isIntersecting && running) {
        running = false;
        cancelAnimationFrame(raf);
        if (svg.current) svg.current.style.opacity = "0";
        if (label.current) label.current.style.opacity = "0";
      }
    });
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [section, bound]);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-30">
      <svg ref={svg} className="absolute inset-0 h-full w-full opacity-0 transition-opacity duration-500" style={{ overflow: "visible" }}>
        {anatomy.map((part, i) => {
          const on = i === active;
          return (
            <g key={part.key} style={{ display: "none" }}>
              <line
                stroke={on ? "var(--accent)" : "var(--line-strong)"}
                strokeWidth={on ? 1.5 : 1}
                strokeDasharray={on ? undefined : "3 4"}
                className="transition-[stroke] duration-300"
              />
              <circle r={on ? 3.5 : 2.5} fill={on ? "var(--accent)" : "var(--muted)"} />
              <circle
                fill={on ? "var(--accent)" : "var(--bg)"}
                stroke={on ? "var(--accent)" : "var(--line-strong)"}
                strokeWidth={1}
                className="transition-[fill,stroke] duration-300"
              />
              <text
                textAnchor="middle"
                dominantBaseline="central"
                className="font-mono text-[11px] font-medium"
                fill={on ? "var(--accent-ink)" : "var(--muted)"}
              >
                {String(i + 1).padStart(2, "0")}
              </text>
            </g>
          );
        })}
      </svg>
      <div
        ref={label}
        className="glass absolute left-0 top-0 whitespace-nowrap rounded-[10px] px-3 py-1.5 text-sm font-medium text-ink opacity-0 transition-opacity duration-300"
      >
        {active >= 0 ? anatomy[active].name : ""}
      </div>
    </div>
  );
}
