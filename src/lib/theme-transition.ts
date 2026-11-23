import { flushSync } from "react-dom";

/** Where the reveal starts: the centre of the clicked control, or a point on the screen. */
export type RevealOrigin = HTMLElement | { x: number; y: number } | null;

const DURATION_MS = 900;
const EASING = "cubic-bezier(0.22, 1, 0.36, 1)";

function pointOf(origin: HTMLElement | { x: number; y: number }): { x: number; y: number } {
  if ("x" in origin) return origin;
  const box = origin.getBoundingClientRect();
  return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
}

/**
 * Switches the colour theme with a circle that grows from the clicked control until the whole
 * screen has the new colours (O, 2026-11-23: the instant flip was hard on the eyes). It uses the
 * browser's View Transitions: the page is frozen as a picture of the old theme, the new theme is
 * applied underneath, and the new picture is revealed through a growing circle.
 *
 * Without View Transitions (older browsers) or with "reduce motion" turned on, the theme just
 * changes at once, as before. `setTheme` is next-themes' function.
 */
export function switchTheme(
  next: string,
  origin: RevealOrigin,
  setTheme: (theme: string) => void,
): void {
  const root = document.documentElement;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!origin || reduceMotion || typeof document.startViewTransition !== "function") {
    setTheme(next);
    return;
  }

  const { x, y } = pointOf(origin);
  // Far enough to cover the screen from the farthest corner.
  const radius = Math.hypot(
    Math.max(x, window.innerWidth - x),
    Math.max(y, window.innerHeight - y),
  );

  const transition = document.startViewTransition(() => {
    flushSync(() => setTheme(next));
    // next-themes applies the class in an effect; make sure the page is already in the new theme
    // when the browser takes the "after" picture.
    const dark =
      next === "dark" ||
      (next === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    root.classList.toggle("dark", dark);
    root.style.colorScheme = dark ? "dark" : "light";
  });

  void transition.ready
    .then(() => {
      root.animate(
        {
          clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`],
        },
        { duration: DURATION_MS, easing: EASING, pseudoElement: "::view-transition-new(root)" },
      );
    })
    // The browser skipped the transition (hidden tab, say): the theme is already applied.
    .catch(() => undefined);
}
