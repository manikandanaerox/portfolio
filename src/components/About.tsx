import { about, profile } from "../content";
import { Img } from "./Img";
import { OrgLogos } from "./OrgLogo";
import { Reveal } from "./Reveal";

const CORNERS = [
  "left-0 top-0 border-l-2 border-t-2 rounded-tl-[6px]",
  "right-0 top-0 border-r-2 border-t-2 rounded-tr-[6px]",
  "left-0 bottom-0 border-l-2 border-b-2 rounded-bl-[6px]",
  "right-0 bottom-0 border-r-2 border-b-2 rounded-br-[6px]",
];

/* Who, in brief: the framed portrait, the story and the three figures, awards beneath. */
export function About() {
  return (
    <section id="about" className="relative py-24 md:py-36">
      <div className="mx-auto grid w-full max-w-[1400px] grid-cols-1 gap-y-14 px-5 md:grid-cols-12 md:gap-x-10 md:px-10">
        <Reveal className="md:col-span-5 lg:col-span-4">
          <div className="relative mx-auto aspect-[4/5] w-full max-w-[22rem] p-3 md:mx-0">
            <Img
              src={profile.photo}
              alt={`Portrait of ${profile.name}`}
              sizes="(min-width: 768px) 360px, 80vw"
              position={profile.photoPosition}
              className="h-full w-full rounded-[14px] ring-1 ring-line-strong"
            />
            {CORNERS.map((c) => (
              <span key={c} aria-hidden className={`absolute h-7 w-7 border-accent ${c}`} />
            ))}
          </div>
        </Reveal>

        <div className="md:col-span-7 md:col-start-6 lg:col-span-7 lg:col-start-6">
          <Reveal>
            <h2 className="display text-[2.6rem] font-semibold leading-[1] md:text-6xl lg:text-7xl">{about.headline}</h2>
          </Reveal>
          <Reveal delay={0.08}>
            <p className="mt-8 max-w-[34ch] text-xl leading-snug tracking-tight md:text-[1.6rem]">{about.body[0]}</p>
          </Reveal>
          <Reveal delay={0.14}>
            <p className="mt-5 max-w-[58ch] leading-relaxed text-muted md:text-lg">{about.body[1]}</p>
          </Reveal>
          <Reveal delay={0.2}>
            <dl className="mt-10 grid grid-cols-1 divide-y divide-line border-y border-line sm:grid-cols-3 sm:divide-x sm:divide-y-0">
              {about.stats.map((s) => (
                <div key={s.value} className="py-5 sm:px-5 sm:first:pl-0">
                  <dt className="display text-4xl font-semibold leading-none text-accent md:text-5xl">{s.value}</dt>
                  <dd className="mt-3 text-sm leading-snug text-muted">{s.label}</dd>
                </div>
              ))}
            </dl>
          </Reveal>
        </div>

        <Reveal delay={0.1} className="md:col-span-12">
          <ul className="grid gap-8 md:grid-cols-3 md:gap-10">
            {about.awards.map((a) => (
              <li key={a.title} className="border-l border-accent pl-5">
                <OrgLogos org={a.logo} className="min-h-[calc(var(--logo-h)*1.45)]" />
                <p className="mt-4 font-mono text-xs text-accent">{a.year}</p>
                <p className="mt-1 font-medium leading-snug">{a.title}</p>
                <p className="mt-1 text-sm text-muted">{a.detail}</p>
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}
