/*
  Organisation logos, drawn as masks filled with the current text colour so they
  read in both themes. Sources: Wikimedia (Dassault Aviation and SAE International
  are public domain; DGAC and Institut Pprime are trademarks shown for affiliation).
  Team Reconnaissance's mark is a JPEG (yellow on black), so it masks by luminance
  and is sized up to crop the empty black margin around the letters.
  Team Phoenix's flame logo is converted to a single-colour mark so it matches the rest.
*/
const LOGOS = {
  dassault: { label: "Dassault Aviation", src: "/images/dassault-aviation.svg", aspect: "688/192", fit: 0.92 },
  sae: { label: "SAE International", src: "/images/sae.svg", aspect: "315/195" },
  dgac: { label: "DGAC", src: "/images/dgac.svg", aspect: "180/179", fit: 1.1 },
  pprime: { label: "Institut Pprime", src: "/images/pprime.svg", aspect: "447/580", fit: 1.22 }, // file has a margin around the mark
  recon: { label: "Team Reconnaissance", src: "/images/team-reconnaissance.jpg", aspect: "2/1", size: "111% auto", luminance: true },
  // Single-colour mark made from the flame logo (its brightness as alpha); the colour version is kept for the 3D decals.
  phoenix: { label: "Team Phoenix", src: "/images/team-phoenix-mark.webp", aspect: "900/460", fit: 1.15 }, // a touch larger than the rest, by request
  isae: { label: "ISAE-ENSMA", src: "/images/isae-ensma.svg", aspect: "201/125" },
  poitiers: { label: "Université de Poitiers", src: "/images/poitiers.svg", aspect: "665/408" },
  // Lettering only (the dark blob behind it removed), cropped to the letters.
  cnrs: { label: "CNRS", src: "/images/cnrs.svg", aspect: "453/190", fit: 0.95 },
} satisfies Record<string, Logo>;

type Logo = { label: string; src: string; aspect: string; size?: string; luminance?: boolean; fit?: number };

export type OrgKey = keyof typeof LOGOS;

/** A single logo or several shown side by side (e.g. SAE + Team Phoenix). */
export const orgList = (o: OrgKey | OrgKey[] | undefined): OrgKey[] => (o ? (Array.isArray(o) ? o : [o]) : []);

/*
  Uniform sizing, calibrated by measuring the rendered ink of every logo
  (target: equal ink bounding-box area, Team Phoenix 15% larger by request).
  Height = base * (REF / aspect)^0.35 * fit: wide wordmarks come out shorter and
  tall marks taller, but less than strict equal-area (exponent 0.5), which made
  wide wordmarks look small. `fit` corrects for empty margins inside a file.
  The base height is one CSS variable (--logo-h in globals.css), used everywhere.
*/
const REF_ASPECT = 1.6;
const ratio = (aspect: string) => {
  const [w, h] = aspect.split("/").map(Number);
  return h ? w / h : w;
};

export function OrgLogos({ org, className }: { org: OrgKey | OrgKey[] | undefined; className?: string }) {
  const list = orgList(org);
  if (!list.length) return null;
  return (
    <span className={`flex flex-wrap items-center gap-x-6 gap-y-3 ${className ?? ""}`}>
      {list.map((k) => (
        <OrgLogo key={k} org={k} />
      ))}
    </span>
  );
}

/** Monochrome logos take the current text colour; `className` defaults to the ink colour. */
export function OrgLogo({ org, className = "text-ink" }: { org: OrgKey; className?: string }) {
  const logo: Logo = LOGOS[org];
  const height = `calc(var(--logo-h) * ${(Math.pow(REF_ASPECT / ratio(logo.aspect), 0.35) * (logo.fit ?? 1)).toFixed(3)})`;
  const mask = `url(${logo.src}) center / ${logo.size ?? "contain"} no-repeat`;
  return (
    <span
      role="img"
      aria-label={logo.label}
      className={`inline-block shrink-0 bg-current align-middle ${className}`}
      style={{
        aspectRatio: logo.aspect,
        height,
        WebkitMask: mask,
        mask,
        ...(logo.luminance && { WebkitMaskSourceType: "luminance", maskMode: "luminance" }),
      }}
    />
  );
}
