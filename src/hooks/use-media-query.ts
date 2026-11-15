"use client";

import { useCallback, useSyncExternalStore } from "react";

/** Whether a media query matches, kept up to date (false while rendering on the server). */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    [query],
  );
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/** The width from which the task detail docks beside the list (docs/new_design.md §3). */
export const DOCK_QUERY = "(min-width: 1200px)";
