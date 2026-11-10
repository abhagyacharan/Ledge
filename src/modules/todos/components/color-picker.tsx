"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { COLOR_CHOICES } from "../colors";

/** A row of named colour swatches. Includes "No colour". Keyboard and screen-reader friendly. */
export function ColorPicker({
  value,
  onChange,
  label = "Colour",
}: {
  value: string | null;
  onChange: (value: string | null) => void;
  label?: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1">
      <button
        type="button"
        role="radio"
        aria-checked={value === null}
        aria-label="No colour"
        onClick={() => onChange(null)}
        className={cn(
          "flex size-11 items-center justify-center rounded-full border text-xs text-muted-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50 md:size-8",
          value === null && "border-foreground text-foreground",
        )}
      >
        {value === null ? <Check className="size-4" /> : "None"}
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
            className="flex size-11 items-center justify-center rounded-full text-white outline-none focus-visible:ring-3 focus-visible:ring-ring/50 md:size-8"
          >
            {selected ? <Check className="size-4" /> : null}
          </button>
        );
      })}
    </div>
  );
}
