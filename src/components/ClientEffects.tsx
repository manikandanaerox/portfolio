"use client";

import { useEffect } from "react";
import { startSmoothScroll } from "@/lib/scroll";

/** Smooth scrolling for the whole page. Renders nothing. */
export function ClientEffects() {
  useEffect(() => startSmoothScroll(), []);
  return null;
}
