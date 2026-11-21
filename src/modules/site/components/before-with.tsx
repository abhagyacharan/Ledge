"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

type Side = "before" | "with";

/**
 * Before and With Ledge. Side by side on wider screens; on phones one card at a time under a
 * Before | With Ledge switch (CSS shows the switch and stacks both cards in one spot). On a phone it
 * flips to With Ledge by itself once, a moment after the section comes into view, unless the visitor
 * has already chosen; a sideways swipe flips it too.
 */
export function BeforeWith({ before, after }: { before: ReactNode; after: ReactNode }) {
  const [side, setSide] = useState<Side>("before");
  const touched = useRef(false);
  const root = useRef<HTMLDivElement>(null);
  const touchX = useRef<number | null>(null);

  useEffect(() => {
    const el = root.current;
    if (!el || !("IntersectionObserver" in window)) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let timer: number | undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        observer.disconnect();
        timer = window.setTimeout(() => {
          if (!touched.current) setSide("with");
        }, 2600);
      },
      { threshold: 0.5 },
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      window.clearTimeout(timer);
    };
  }, []);

  const choose = (next: Side) => {
    touched.current = true;
    setSide(next);
  };

  return (
    <div ref={root} className="bw-wrap">
      <div className="bw-toggle seg" role="group" aria-label="Compare">
        <button
          type="button"
          className={side === "before" ? "on" : ""}
          aria-pressed={side === "before"}
          onClick={() => choose("before")}
        >
          Before
        </button>
        <button
          type="button"
          className={side === "with" ? "on" : ""}
          aria-pressed={side === "with"}
          onClick={() => choose("with")}
        >
          With Ledge
        </button>
      </div>
      <div
        className="bw"
        data-side={side}
        onTouchStart={(e) => {
          touchX.current = e.touches[0]?.clientX ?? null;
        }}
        onTouchEnd={(e) => {
          const start = touchX.current;
          const end = e.changedTouches[0]?.clientX;
          touchX.current = null;
          if (start == null || end == null || Math.abs(end - start) < 40) return;
          choose(end < start ? "with" : "before");
        }}
      >
        {before}
        {after}
      </div>
    </div>
  );
}
