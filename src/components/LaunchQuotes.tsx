"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useMotionValueEvent, useReducedMotion, useTransform, type MotionValue } from "motion/react";
import { quotes, type Quote } from "../data/quotes";

/*
  Quotes beside the launch. Once the headline has cleared and the engines are
  lit, two quote slots (left and right of the climbing vehicle; one on phones)
  cycle through a shuffled deck, out of step with each other. Each quote reveals
  word by word, holds long enough to read, and gives way to the next.
  Runs only while the launch is on screen; the deck is shuffled per visit.
*/

const ease = [0.16, 1, 0.3, 1] as const;
const ON = 0.23; // hero progress where quotes start: just after liftoff, once the camera tracks the vehicle
const OFF = 0.96;

function shuffle<T>(a: T[]) {
  const b = a.slice();
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}

/** Reading time: a base hold plus time per word. */
const holdFor = (q: Quote) => 2600 + q.text.split(" ").length * 230;

function Slot({ deck, start, delay = 0, active: on, className }: { deck: Quote[]; start: number; delay?: number; active: boolean; className: string }) {
  const reduce = useReducedMotion();
  const [i, setI] = useState(start);
  const q = deck[i % deck.length];

  // Optional lag before this slot first shows, so paired slots stay out of step.
  const [active, setActive] = useState(false);
  useEffect(() => {
    if (!on) return setActive(false);
    const id = window.setTimeout(() => setActive(true), delay);
    return () => window.clearTimeout(id);
  }, [on, delay]);

  useEffect(() => {
    if (!active) return;
    const id = window.setTimeout(() => setI((n) => n + 1), holdFor(q));
    return () => window.clearTimeout(id);
  }, [active, i, q]);

  const words = q.text.split(" ");
  return (
    <div className={`pointer-events-none absolute ${className}`}>
      <AnimatePresence mode="wait">
        {active && (
          <motion.figure
            key={i}
            initial="hidden"
            animate="show"
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -10, filter: "blur(6px)", transition: { duration: 0.45, ease } }}
            variants={{ show: { transition: { staggerChildren: reduce ? 0 : 0.045 } } }}
          >
            <blockquote className="text-xl font-medium leading-snug tracking-tight text-ink/90 md:text-2xl lg:text-[1.75rem]">
              <span aria-hidden className="mr-1 text-accent">“</span>
              {words.map((w, k) => (
                <motion.span
                  key={k}
                  className="inline-block whitespace-pre"
                  variants={{
                    hidden: reduce ? { opacity: 0 } : { opacity: 0, y: 8, filter: "blur(8px)" },
                    show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.55, ease } },
                  }}
                >
                  {w + (k < words.length - 1 ? " " : "")}
                </motion.span>
              ))}
              <span aria-hidden className="text-accent">”</span>
            </blockquote>
            <motion.figcaption
              className="mt-3 font-mono text-xs text-accent md:text-sm"
              variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { delay: reduce ? 0 : 0.25 + words.length * 0.045, duration: 0.5 } } }}
            >
              {q.by}
            </motion.figcaption>
          </motion.figure>
        )}
      </AnimatePresence>
    </div>
  );
}

export function LaunchQuotes({ progress }: { progress: MotionValue<number> }) {
  // Shuffle on the client only, so server and client markup agree.
  const [deck, setDeck] = useState<Quote[] | null>(null);
  useEffect(() => setDeck(shuffle(quotes)), []);

  const [active, setActive] = useState(false);
  const activeRef = useRef(false);
  useMotionValueEvent(progress, "change", (p) => {
    const on = p > ON && p < OFF;
    if (on !== activeRef.current) {
      activeRef.current = on;
      setActive(on);
    }
  });
  const opacity = useTransform(progress, [ON - 0.02, ON + 0.02, OFF - 0.03, OFF], [0, 1, 1, 0]);

  const [wide, setWide] = useState(true);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const update = () => setWide(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const half = useMemo(() => (deck ? Math.floor(deck.length / 2) : 0), [deck]);
  if (!deck) return null;

  return (
    <motion.div aria-hidden style={{ opacity }} className="pointer-events-none absolute inset-0">
      {wide ? (
        <>
          {/* Two slots walk the deck from opposite halves, the right one starting a beat later. */}
          <Slot deck={deck} start={0} active={active} className="left-10 top-[22%] w-[min(27rem,30vw)]" />
          <Slot deck={deck} start={half} delay={3200} active={active} className="bottom-[20%] right-10 w-[min(27rem,30vw)] text-right" />
        </>
      ) : (
        <Slot deck={deck} start={0} active={active} className="inset-x-5 top-6" />
      )}
    </motion.div>
  );
}
