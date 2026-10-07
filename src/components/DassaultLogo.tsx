/**
 * Dassault Aviation wordmark (Wikimedia Commons, public domain), drawn as a mask
 * filled with the current text colour so it reads in both themes.
 */
export function DassaultLogo({ className = "h-3.5" }: { className?: string }) {
  return (
    <span
      role="img"
      aria-label="Dassault Aviation"
      className={`inline-block aspect-[688/192] shrink-0 bg-current align-middle ${className}`}
      style={{
        WebkitMask: "url(/images/dassault-aviation.svg) center / contain no-repeat",
        mask: "url(/images/dassault-aviation.svg) center / contain no-repeat",
      }}
    />
  );
}
