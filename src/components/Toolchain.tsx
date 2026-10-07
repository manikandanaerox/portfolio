import { toolchain } from "../content";

export function Toolchain() {
  const row = [...toolchain, ...toolchain];
  return (
    <section aria-labelledby="toolchain-title" className="relative py-16 md:py-24">
      <h2 id="toolchain-title" className="display mx-auto max-w-[1400px] px-5 text-2xl font-semibold md:px-10 md:text-3xl">
        Tools I work with
      </h2>
      <div className="marquee mt-10 overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_12%,#000_88%,transparent)]">
        <ul className="marquee-track flex w-max items-center gap-14 pr-14">
          {row.map((t, i) => (
            <li key={i} aria-hidden={i >= toolchain.length} className="flex items-center gap-3 text-muted transition-colors hover:text-ink">
              {t.icon && (
                <svg aria-hidden viewBox="0 0 24 24" className="h-7 w-7 fill-current">
                  <path d={t.icon.path} />
                </svg>
              )}
              <span className="whitespace-nowrap text-lg font-medium">{t.name}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
