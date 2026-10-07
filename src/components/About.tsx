import { about } from "../content";
import { Reveal } from "./Reveal";

export function About() {
  return (
    <section id="about" className="relative flex min-h-[100dvh] items-center py-24 md:py-32">
      <div className="mx-auto grid w-full max-w-[1400px] grid-cols-1 px-5 md:grid-cols-12 md:px-10">
        {/* Left columns stay clear on desktop: the aircraft holds position there. */}
        <div className="md:col-span-7 md:col-start-6 lg:col-span-6 lg:col-start-7">
          <Reveal>
            <h2 className="display text-4xl font-semibold leading-[1.02] md:text-[3.4rem]">{about.headline}</h2>
          </Reveal>
          <Reveal delay={0.08}>
            <p className="mt-8 text-xl leading-snug tracking-tight md:text-2xl">{about.body[0]}</p>
          </Reveal>
          <Reveal delay={0.14}>
            <p className="mt-6 max-w-[58ch] leading-relaxed text-muted md:text-lg">{about.body[1]}</p>
          </Reveal>
          <Reveal delay={0.2}>
            <dl className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-3">
              {about.facts.map((f) => (
                <div key={f.label} className="border-l border-accent pl-4">
                  <dt className="font-mono text-xs text-muted">{f.label}</dt>
                  <dd className="mt-2 font-medium leading-snug">{f.value}</dd>
                </div>
              ))}
            </dl>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
