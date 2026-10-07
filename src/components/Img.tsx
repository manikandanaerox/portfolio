"use client";

import Image from "next/image";
import { useState } from "react";

/** next/image with a skeleton until loaded and a quiet fallback on error. Size comes from className. */
export function Img({
  src, alt, className = "", priority = false, sizes = "100vw", position = "50% 50%",
}: { src: string; alt: string; className?: string; priority?: boolean; sizes?: string; position?: string }) {
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  return (
    <div className={`${/\b(absolute|fixed)\b/.test(className) ? "" : "relative "}overflow-hidden bg-surface-2 ${className}`}>
      {state === "loading" && <div className="absolute inset-0 animate-pulse bg-surface-2" />}
      {state === "error" ? (
        <div className="absolute inset-0 grid place-items-center text-sm text-muted">Image unavailable</div>
      ) : (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          onLoad={() => setState("ready")}
          onError={() => setState("error")}
          className="object-cover transition-[opacity,transform] duration-700 ease-out-expo"
          style={{ objectPosition: position, opacity: state === "ready" ? 1 : 0, transform: state === "ready" ? "scale(1)" : "scale(1.04)" }}
        />
      )}
    </div>
  );
}
