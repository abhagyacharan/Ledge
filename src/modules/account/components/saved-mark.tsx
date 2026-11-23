"use client";

import { Check } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/** "✓ Saved" in mono, right-aligned in the row that changed; fades after about 2 seconds. */
export function SavedMark({ at }: { at: number | null }) {
  const [shown, setShown] = useState<number | null>(null);
  useEffect(() => {
    if (at === null) return;
    const show = setTimeout(() => setShown(at), 0);
    const hide = setTimeout(() => setShown(null), 2000);
    return () => {
      clearTimeout(show);
      clearTimeout(hide);
    };
  }, [at]);
  return (
    <span
      role="status"
      className={cn(
        "ml-auto inline-flex shrink-0 items-center gap-1 font-mono text-[12px] font-medium text-dash-ink-soft transition-opacity duration-200",
        shown ? "opacity-100" : "opacity-0",
      )}
    >
      {shown ? (
        <>
          <Check aria-hidden className="size-3" />
          Saved
        </>
      ) : null}
    </span>
  );
}
