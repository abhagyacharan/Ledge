import { cn } from "@/lib/utils";

/**
 * A soft, grainy green-and-orange gradient (docs/design.md §5g), used behind the sign-in and
 * sign-up forms. The layout calls `randomGradient()` on the server for every visit, so each page
 * load gets a new arrangement; this component only draws it. Decoration only (hidden from
 * screen readers).
 */

const GREENS = ["#14532d", "#1f6b4a", "#2f7d5b", "#4f9a76", "#8fcfaa"];
const ORANGES = ["#c2410c", "#e8662a", "#f2843f", "#f6a66a", "#fbcfa6"];

const pick = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)];
const between = (min: number, max: number) => Math.round(min + Math.random() * (max - min));

/** A random stack of colour blobs over a green-to-orange wash, as CSS background layers. */
export function randomGradient(): string {
  const blobs = Array.from({ length: 5 }, (_, i) => {
    // Alternate so there is always both green and orange in the mix.
    const colour = i % 2 === 0 ? pick(ORANGES) : pick(GREENS);
    return `radial-gradient(circle at ${between(0, 100)}% ${between(0, 100)}%, ${colour} 0%, transparent ${between(38, 68)}%)`;
  });
  const wash = `linear-gradient(${between(0, 359)}deg, ${pick(GREENS)}, ${pick(ORANGES)})`;
  return [...blobs, wash].join(", ");
}

export function GrainGradient({ layers, className }: { layers: string; className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}
    >
      <div className="absolute inset-0 scale-110 blur-2xl" style={{ backgroundImage: layers }} />
      {/* Film grain: fine monochrome noise laid over the colour. */}
      <svg className="absolute inset-0 h-full w-full opacity-45 mix-blend-soft-light">
        <filter id="ledge-grain">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.85"
            numOctaves="3"
            stitchTiles="stitch"
          />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#ledge-grain)" />
      </svg>
    </div>
  );
}
