/*
  Organisation logos, drawn as masks filled with the current text colour so they
  read in both themes. Sources: Wikimedia (Dassault Aviation and SAE International
  are public domain; DGAC and Institut Pprime are trademarks shown for affiliation).
  Team Reconnaissance's mark is a JPEG (yellow on black), so it masks by luminance
  and is sized up to crop the empty black margin around the letters.
  Team Phoenix's mark is a full-colour flame on black, kept in colour (`color`):
  on the dark theme its black blends away (screen), on the light theme it sits on a dark badge.
*/
const LOGOS = {
  dassault: { label: "Dassault Aviation", src: "/images/dassault-aviation.svg", aspect: "688/192" },
  sae: { label: "SAE International", src: "/images/sae.svg", aspect: "315/195" },
  dgac: { label: "DGAC", src: "/images/dgac.svg", aspect: "180/179" },
  pprime: { label: "Institut Pprime", src: "/images/pprime.svg", aspect: "447/580" },
  recon: { label: "Team Reconnaissance", src: "/images/team-reconnaissance.jpg", aspect: "2/1", size: "111% auto", luminance: true },
  phoenix: { label: "Team Phoenix", src: "/images/team-phoenix.webp", aspect: "900/472", color: true },
  isae: { label: "ISAE-ENSMA", src: "/images/isae-ensma.svg", aspect: "201/125" },
  poitiers: { label: "Université de Poitiers", src: "/images/poitiers.svg", aspect: "665/408" },
  // Lettering only (the dark blob behind it removed), cropped to the letters.
  cnrs: { label: "CNRS", src: "/images/cnrs.svg", aspect: "453/190" },
} satisfies Record<string, Logo>;

type Logo = { label: string; src: string; aspect: string; size?: string; luminance?: boolean; color?: boolean };

export type OrgKey = keyof typeof LOGOS;

/** A single logo or several shown side by side (e.g. SAE + Team Phoenix). */
export const orgList = (o: OrgKey | OrgKey[] | undefined): OrgKey[] => (o ? (Array.isArray(o) ? o : [o]) : []);

/*
  Uniform sizing: every logo gets the same visual area, whatever its shape.
  Height = base * sqrt(REF / aspect), so a wide wordmark is shorter and a tall
  mark is taller, and they read as the same size side by side. The base height
  is one CSS variable (--logo-h in globals.css), the same in every section.
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
  const height = `calc(var(--logo-h) * ${Math.sqrt(REF_ASPECT / ratio(logo.aspect)).toFixed(3)})`;
  if (logo.color)
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={logo.src} alt={logo.label} className={`logo-color inline-block w-auto shrink-0 align-middle ${className}`} style={{ aspectRatio: logo.aspect, height }} />
    );
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
