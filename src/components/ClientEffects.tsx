"use client";

import { useEffect } from "react";
import { observeLayout } from "@/lib/layout";
import { startSmoothScroll } from "@/lib/scroll";

/** Smooth scrolling + section measurement for the 3D choreography. Renders nothing. */
export function ClientEffects() {
  useEffect(() => {
    const stopLayout = observeLayout();
    const stopScroll = startSmoothScroll();
    return () => {
      stopLayout();
      stopScroll();
    };
  }, []);
  return null;
}
