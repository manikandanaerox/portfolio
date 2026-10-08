import { earlier, education, journey, languages, leadership } from "../content";
import { OrgLogo } from "./OrgLogo";
import { Reveal } from "./Reveal";

// Wordmarks are wide, Pprime's mark is tall: per-logo heights keep them optically matched.
const LOGO_HEIGHT = { dassault: "h-6", sae: "h-8", dgac: "h-9", pprime: "h-12", recon: "h-7" } as const;

/* Flight log: four main roles, then earlier internships, leadership and education as compact rows. */
export function Journey() {
  return (
    <section id="journey" className="relative py-24 md:py-40">
      <div className="mx-auto grid w-full max-w-[1400px] grid-cols-1 px-5 md:grid-cols-12 md:px-10">
        <div className="md:col-span-7 lg:col-span-6">
          <Reveal>
            <h2 className="display text-[2.6rem] font-semibold leading-[1] md:text-7xl lg:text-8xl">Flight log.</h2>
          </Reveal>
          <ol className="mt-12">
            {journey.map((j, i) => (
              <li key={j.title} className="border-t border-line py-8 first:border-t-0 first:pt-0">
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

          <Reveal className="mt-4 grid grid-cols-1 gap-10 border-t border-line pt-10 sm:grid-cols-2">
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
