import { about } from "../content";
import { DassaultLogo } from "./DassaultLogo";
import { Reveal } from "./Reveal";

export function About() {
  return (
    <section id="about" className="relative flex min-h-[100dvh] items-center py-24 md:py-32">
      <div className="mx-auto grid w-full max-w-[1400px] grid-cols-1 px-5 md:grid-cols-12 md:px-10">
        {/* Left columns stay clear on desktop: the racer flies there. */}
        <div className="md:col-span-7 md:col-start-6 lg:col-span-6 lg:col-start-7">
          <Reveal>
            <h2 className="display text-[2.6rem] font-semibold leading-[1] md:text-6xl">{about.headline}</h2>
          </Reveal>
          <Reveal delay={0.08}>
            <p className="mt-8 text-xl leading-snug tracking-tight md:text-[1.55rem]">{about.body[0]}</p>
          </Reveal>
          <Reveal delay={0.14}>
            <p className="mt-5 max-w-[58ch] leading-relaxed text-muted md:text-lg">{about.body[1]}</p>
          </Reveal>

          {/* Figures from the CV */}
          <Reveal delay={0.2}>
            <dl className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-3 sm:gap-6">
              {about.stats.map((s) => (
                <div key={s.value}>
                  <dt className="display text-5xl font-semibold leading-none text-accent md:text-6xl">{s.value}</dt>
                  <dd className="mt-3 text-sm leading-snug text-muted">{s.label}</dd>
                </div>
              ))}
            </dl>
          </Reveal>

          <Reveal delay={0.26}>
            <ul className="mt-12 grid gap-5">
              {about.awards.map((a) => (
                <li key={a.title} className="grid grid-cols-[3.5rem_1fr] gap-4 border-l border-accent pl-4">
                  <span className="font-mono text-sm text-accent">{a.year}</span>
                  <span>
                    {"dassault" in a && a.dassault && <DassaultLogo className="mb-2.5 block h-7" />}
                    <span className="block font-medium leading-snug">{a.title}</span>
                    <span className="mt-1 block text-sm text-muted">{a.detail}</span>
                  </span>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
