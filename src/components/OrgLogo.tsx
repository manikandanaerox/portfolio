/*
  Organisation logos, drawn as masks filled with the current text colour so they
  read in both themes. Sources: Wikimedia (Dassault Aviation and SAE International
  are public domain; DGAC and Institut Pprime are trademarks shown for affiliation).
  Team Reconnaissance's mark is a JPEG (yellow on black), so it masks by luminance
  and is sized up to crop the empty black margin around the letters.
*/
const LOGOS = {
  dassault: { label: "Dassault Aviation", src: "/images/dassault-aviation.svg", aspect: "688/192" },
  sae: { label: "SAE International", src: "/images/sae.svg", aspect: "315/195" },
  dgac: { label: "DGAC", src: "/images/dgac.svg", aspect: "180/179" },
  pprime: { label: "Institut Pprime", src: "/images/pprime.svg", aspect: "447/580" },
  recon: { label: "Team Reconnaissance", src: "/images/team-reconnaissance.jpg", aspect: "2/1", size: "111% auto", luminance: true },
} satisfies Record<string, { label: string; src: string; aspect: string; size?: string; luminance?: boolean }>;

export type OrgKey = keyof typeof LOGOS;

export function OrgLogo({ org, className = "h-3.5" }: { org: OrgKey; className?: string }) {
  const logo: { label: string; src: string; aspect: string; size?: string; luminance?: boolean } = LOGOS[org];
  const mask = `url(${logo.src}) center / ${logo.size ?? "contain"} no-repeat`;
  return (
    <span
      role="img"
      aria-label={logo.label}
      className={`inline-block shrink-0 bg-current align-middle ${className}`}
      style={{
        aspectRatio: logo.aspect,
        WebkitMask: mask,
        mask,
        ...(logo.luminance && { WebkitMaskSourceType: "luminance", maskMode: "luminance" }),
      }}
    />
  );
}
