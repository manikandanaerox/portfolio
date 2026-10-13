import { photos } from "../data/gallery";

/*
  Photos: one strip that drifts left to right on its own, edges fading into the
  page. Photos share a height and keep their natural widths. Hover pauses it.
  The list is doubled so the loop is seamless (CSS animation in globals.css,
  stopped for reduced motion).
*/
export function Gallery() {
  const row = [...photos, ...photos];
  return (
    <section id="gallery" aria-label="Photos" className="relative py-24 md:py-32">
      <div className="mx-auto max-w-[1400px] px-5 md:px-10">
        <h2 className="display text-[2.4rem] font-semibold leading-[1] md:text-6xl">Off the screen.</h2>
        <p className="mt-4 max-w-[46ch] text-muted md:text-lg">Flying, building and testing with the team, and Paris in between.</p>
      </div>
      <div className="photo-strip mt-12 overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)] md:mt-16">
        <ul className="photo-strip-track flex w-max gap-3 md:gap-4">
          {row.map((p, i) => (
            <li key={i} aria-hidden={i >= photos.length} className="h-56 shrink-0 overflow-hidden rounded-[14px] bg-surface-2 md:h-80" style={{ aspectRatio: `${p.w} / ${p.h}` }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.src} alt={i < photos.length ? `${p.tag}: ${p.caption}` : ""} loading="lazy" decoding="async" draggable={false} className="h-full w-full select-none object-cover" />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
