import { APP_NAME } from "@/config/app";
import { cn } from "@/lib/utils";

/**
 * The Ledge logo, "the bottom line" (docs/brand/usage.md): a capital L standing on the double rule an
 * accountant draws under a final total. Drawn on a 32-unit grid where one stroke is 4 units, so it is
 * pixel-sharp whenever a stroke is a whole number of pixels (16px icon = 2px strokes).
 *
 * The second rule is always the orange accent (O, 2026-11-12); the L and the word take the text colour.
 */
const L_PATH = "M6 4h4v12h16v4H6z";
const RULE_PATH = "M6 24h20v4H6z";

/** "Ledge" in Bricolage Grotesque 600 (optical size 96), outlined; baseline at y 0, cap height 24. */
const WORDMARK =
  "M1.67 0V-24H6.29V0ZM2.72 0V-3.99H16.19V0ZM25.71 0.5Q23.24 0.5 21.48 -0.24Q19.72 -0.98 18.59 -2.3Q17.47 -3.62 16.93 -5.38Q16.4 -7.14 16.4 -9.19Q16.4 -11.26 16.93 -13.12Q17.47 -14.98 18.56 -16.41Q19.66 -17.84 21.36 -18.67Q23.05 -19.49 25.38 -19.49Q27.61 -19.49 29.26 -18.72Q30.91 -17.95 31.95 -16.55Q32.98 -15.15 33.36 -13.25Q33.75 -11.35 33.45 -9.07L19.26 -8.84V-11.56L29.99 -11.76L29.25 -10.18Q29.39 -11.92 29.01 -13.16Q28.63 -14.4 27.74 -15.07Q26.85 -15.75 25.38 -15.75Q23.82 -15.75 22.81 -14.95Q21.81 -14.16 21.34 -12.73Q20.87 -11.3 20.87 -9.39Q20.87 -6.22 22.12 -4.64Q23.36 -3.05 25.78 -3.05Q26.93 -3.05 27.7 -3.39Q28.46 -3.72 28.92 -4.29Q29.37 -4.86 29.55 -5.57Q29.72 -6.28 29.67 -7.02L33.93 -6.75Q33.99 -5.38 33.56 -4.09Q33.13 -2.8 32.14 -1.77Q31.15 -0.74 29.56 -0.12Q27.96 0.5 25.71 0.5ZM42.76 0.5Q40.73 0.5 39.05 -0.58Q37.38 -1.66 36.39 -3.9Q35.39 -6.15 35.39 -9.62Q35.39 -12.9 36.3 -15.09Q37.2 -17.28 38.83 -18.39Q40.46 -19.49 42.61 -19.49Q44.4 -19.49 45.73 -18.72Q47.05 -17.95 47.89 -16.36Q48.73 -14.78 49.05 -12.33H49.39Q49.19 -13.81 49.02 -15.08Q48.85 -16.36 48.76 -17.48Q48.68 -18.59 48.68 -19.55V-25.09H53.31L53.27 -7.52L53.32 0H49.2L49.38 -6.17H49.1Q48.67 -3.94 47.82 -2.45Q46.97 -0.97 45.72 -0.24Q44.46 0.5 42.76 0.5ZM44.16 -3.28Q45.22 -3.28 46.07 -3.79Q46.91 -4.29 47.48 -5.16Q48.06 -6.02 48.37 -7.1Q48.68 -8.17 48.68 -9.3V-9.56Q48.68 -10.41 48.48 -11.27Q48.29 -12.13 47.92 -12.9Q47.55 -13.66 47.01 -14.26Q46.47 -14.86 45.76 -15.21Q45.05 -15.55 44.19 -15.55Q42.9 -15.55 41.96 -14.75Q41.03 -13.95 40.55 -12.56Q40.06 -11.16 40.06 -9.36Q40.06 -7.61 40.54 -6.23Q41.02 -4.85 41.93 -4.07Q42.85 -3.28 44.16 -3.28ZM63.43 5.62Q60.22 5.62 58.38 5.12Q56.53 4.62 55.76 3.75Q54.99 2.87 54.99 1.75Q54.99 0.18 56.26 -0.81Q57.53 -1.81 60.06 -2.23V-2.48Q58.08 -2.48 57.05 -3.04Q56.01 -3.59 56.01 -4.65Q56.01 -5.65 56.98 -6.41Q57.94 -7.18 60.21 -7.39V-7.7Q58.05 -8.1 56.88 -9.46Q55.72 -10.82 55.72 -12.86Q55.72 -14.7 56.7 -16.07Q57.67 -17.44 59.48 -18.21Q61.3 -18.98 63.79 -18.98H73.27V-15.27L66.85 -16.1V-15.77Q69.59 -15.35 70.63 -14.3Q71.67 -13.26 71.67 -11.82Q71.67 -10.39 70.83 -9.25Q69.99 -8.12 68.3 -7.48Q66.61 -6.84 64.07 -6.84Q63.35 -6.84 62.66 -6.9Q61.98 -6.96 61.37 -7.1Q60.33 -6.72 59.88 -6.34Q59.43 -5.96 59.43 -5.65Q59.43 -5.41 59.67 -5.29Q59.92 -5.18 60.33 -5.14Q60.75 -5.1 61.25 -5.1H67.01Q67.68 -5.1 68.81 -5.02Q69.93 -4.93 71.07 -4.5Q72.22 -4.07 72.99 -3.08Q73.77 -2.1 73.77 -0.28Q73.77 1.73 72.64 3.04Q71.52 4.34 69.23 4.98Q66.95 5.62 63.43 5.62ZM63.3 1.56Q65.93 1.56 67.31 1.33Q68.69 1.1 69.21 0.67Q69.72 0.23 69.72 -0.36Q69.72 -1.02 69.36 -1.38Q69.01 -1.75 68.45 -1.9Q67.89 -2.06 67.3 -2.09Q66.7 -2.12 66.22 -2.12H61.42Q59.92 -1.58 59.35 -1.11Q58.78 -0.64 58.78 0.01Q58.78 0.7 59.35 1.03Q59.93 1.36 60.95 1.46Q61.96 1.56 63.3 1.56ZM63.89 -9.55Q65.45 -9.55 66.36 -10.41Q67.27 -11.26 67.27 -12.73Q67.27 -14.21 66.33 -15.12Q65.38 -16.04 63.82 -16.04Q62.23 -16.04 61.27 -15.11Q60.32 -14.18 60.32 -12.76Q60.32 -11.81 60.76 -11.08Q61.2 -10.35 62.01 -9.95Q62.81 -9.55 63.89 -9.55ZM83.24 0.5Q80.76 0.5 79.01 -0.24Q77.25 -0.98 76.12 -2.3Q74.99 -3.62 74.46 -5.38Q73.93 -7.14 73.93 -9.19Q73.93 -11.26 74.46 -13.12Q74.99 -14.98 76.09 -16.41Q77.19 -17.84 78.88 -18.67Q80.58 -19.49 82.91 -19.49Q85.14 -19.49 86.79 -18.72Q88.44 -17.95 89.47 -16.55Q90.51 -15.15 90.89 -13.25Q91.27 -11.35 90.98 -9.07L76.79 -8.84V-11.56L87.52 -11.76L86.78 -10.18Q86.92 -11.92 86.54 -13.16Q86.16 -14.4 85.27 -15.07Q84.38 -15.75 82.91 -15.75Q81.35 -15.75 80.34 -14.95Q79.33 -14.16 78.87 -12.73Q78.4 -11.3 78.4 -9.39Q78.4 -6.22 79.64 -4.64Q80.88 -3.05 83.31 -3.05Q84.46 -3.05 85.22 -3.39Q85.99 -3.72 86.44 -4.29Q86.9 -4.86 87.07 -5.57Q87.25 -6.28 87.2 -7.02L91.45 -6.75Q91.52 -5.38 91.08 -4.09Q90.65 -2.8 89.67 -1.77Q88.68 -0.74 87.08 -0.12Q85.49 0.5 83.24 0.5Z";

/** The L (text colour) and the orange second rule, on the 32-unit grid. */
function MarkPaths({ transform }: { transform?: string }) {
  return (
    <g transform={transform}>
      <path d={L_PATH} />
      <path d={RULE_PATH} className="fill-dash-accent" />
    </g>
  );
}

/** The mark alone: 15 x 18px, 3px strokes. */
export function LedgeMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="6 4 20 24"
      fill="currentColor"
      aria-hidden
      className={cn("h-[18px] w-[15px] shrink-0", className)}
    >
      <MarkPaths />
    </svg>
  );
}

/**
 * The full lockup (mark and wordmark). The mark's L and the word's L are the same height. Sizes keep
 * strokes on whole pixels: md is 3px strokes, lg is 4px.
 */
export function Brand({ className, size = "md" }: { className?: string; size?: "md" | "lg" }) {
  return (
    <svg
      viewBox="0 -28 120 36"
      fill="currentColor"
      role="img"
      aria-label={APP_NAME}
      className={cn("shrink-0", size === "lg" ? "h-9 w-[120px]" : "h-[27px] w-[90px]", className)}
    >
      <MarkPaths transform="translate(-6 -28)" />
      <path d={WORDMARK} transform="translate(27.33 0)" />
    </svg>
  );
}

/**
 * The app icon as a tile: the light mark and orange rule on the cover green-black, the same picture
 * as the home-screen icon. 72px with 6px strokes (1.5px per grid unit, every edge on a whole pixel).
 */
export function BrandTile({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      aria-hidden
      className={cn("size-[72px] shrink-0 text-[#f2f4f1] [--dash-accent:#f58445]", className)}
    >
      <rect width="48" height="48" rx="10.75" fill="#121514" />
      <g fill="currentColor">
        <MarkPaths transform="translate(8 8)" />
      </g>
    </svg>
  );
}

/** "Ledge" alone, in the text colour: 69 x 24px (cap height 18px). */
export function Wordmark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="1 -26 92 32"
      fill="currentColor"
      role="img"
      aria-label={APP_NAME}
      className={cn("h-6 w-[69px] shrink-0", className)}
    >
      <path d={WORDMARK} />
    </svg>
  );
}
