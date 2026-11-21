"use client";

import { useEffect } from "react";

/** Elements that animate when they scroll into view (see "Scroll reveals" in ../site.css). */
const TARGETS = "[data-reveal], .bw-card, .step, .foot";

/**
 * Turns on the scroll reveals: adds `.motion` to the page root, then `.in` to each target the first
 * time a fifth of it is on screen. Does nothing with reduced motion or without IntersectionObserver,
 * so content is never left hidden.
 */
export function SiteMotion() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".lg");
    if (!root || !("IntersectionObserver" in window)) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("in");
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.2, rootMargin: "0px 0px -8% 0px" },
    );
    root.querySelectorAll(TARGETS).forEach((el) => observer.observe(el));
    root.classList.add("motion");
    return () => {
      observer.disconnect();
      root.classList.remove("motion");
    };
  }, []);
  return null;
}
