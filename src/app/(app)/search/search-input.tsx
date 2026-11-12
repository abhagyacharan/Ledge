"use client";

import { useEffect, useRef } from "react";
import { isTouchDevice } from "@/lib/touch";

/**
 * The search box. With a mouse the cursor is already in it; on a phone it is not, so the
 * keyboard stays closed until you tap the box (O, 2026-11-13).
 */
export function SearchInput({ defaultValue }: { defaultValue: string }) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!isTouchDevice()) ref.current?.focus();
  }, []);

  return (
    <input
      ref={ref}
      id="search-input"
      name="q"
      type="search"
      enterKeyHint="search"
      defaultValue={defaultValue}
      placeholder="Search tasks and expenses"
      autoComplete="off"
      maxLength={200}
      className="h-11 w-full rounded-full bg-dash-well pr-4 pl-10 text-base text-dash-ink outline-none placeholder:text-dash-ink-soft focus-visible:ring-3 focus-visible:ring-ring/50 md:h-10 md:text-sm"
    />
  );
}
