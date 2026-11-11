"use client";

import { Ban, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { COLOR_CHOICES } from "../colors";

/**
 * Named colour swatches, plus "No colour". The chosen one gets an ink ring and a tick, so colour
 * is never the only signal; each swatch also has its name for screen readers and as a tooltip.
 */
export function ColorPicker({
  value,
  onChange,
  label = "Colour",
}: {
  value: string | null;
  onChange: (value: string | null) => void;
  label?: string;
}) {
  const ring = "shadow-[0_0_0_2px_var(--dash-card),0_0_0_4px_var(--dash-ink)]";
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1.5">
      <button
        type="button"
        role="radio"
        aria-checked={value === null}
        aria-label="No colour"
        title="No colour"
        onClick={() => onChange(null)}
        className={cn(
          "grid size-11 place-items-center rounded-full bg-dash-well text-dash-ink-soft outline-none transition-[transform,box-shadow] duration-150 ease-snap focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-95 md:size-9",
          value === null && ring,
        )}
      >
        {value === null ? <Check className="size-4 text-dash-ink" /> : <Ban className="size-4" />}
      </button>
      {COLOR_CHOICES.map((c) => {
        const selected = value?.toLowerCase() === c.value;
        return (
          <button
            key={c.value}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={c.name}
            title={c.name}
            onClick={() => onChange(c.value)}
            style={{ backgroundColor: c.value }}
            className={cn(
              "grid size-11 place-items-center rounded-full text-white outline-none transition-[transform,box-shadow] duration-150 ease-snap focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-95 md:size-9",
              selected && ring,
            )}
          >
            {selected ? <Check className="size-4" strokeWidth={3} /> : null}
          </button>
        );
      })}
    </div>
  );
}
