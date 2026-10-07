import { journey } from "../content";
import { Reveal } from "./Reveal";

/* Flight log: four entries, so one hairline between rows reads as a log, not a spec table. */
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
                <Reveal delay={0.05 * i} className="grid grid-cols-1 gap-3 sm:grid-cols-[7.5rem_1fr] sm:gap-8">
                  <p className="font-mono text-sm text-accent">{j.when}</p>
                  <div>
                    <h3 className="text-xl font-semibold tracking-tight md:text-2xl">{j.title}</h3>
                    <p className="mt-1 text-sm text-muted">{j.where}</p>
                    <p className="mt-3 max-w-[52ch] leading-relaxed text-muted">{j.body}</p>
                  </div>
                </Reveal>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
