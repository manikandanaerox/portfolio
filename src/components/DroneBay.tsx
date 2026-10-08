/**
 * Phones only: an empty band at the top of a section where that section's
 * aircraft hovers (see `bay` in three/Flight.tsx). On desktop the aircraft
 * flies in an empty column instead, so the bay collapses.
 */
export function DroneBay({ id, className = "h-[34svh]" }: { id: string; className?: string }) {
  return <div id={`bay-${id}`} aria-hidden className={`md:hidden ${className}`} />;
}
