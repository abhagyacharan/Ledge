"use client";

import { useSyncExternalStore } from "react";

/**
 * Small browser-only memories of the review: which view the person likes (Cards or List) and
 * where they were in a draft. localStorage can be blocked or throw, so every touch is guarded
 * and the screen works without it.
 */

export type ReviewView = "cards" | "list";

const VIEW_KEY = "ledge:plan-review-view";
const listeners = new Set<() => void>();
/** The choice this session; used when storage is blocked and cannot be read back. */
let sessionView: ReviewView | null = null;

function readView(): ReviewView {
  if (sessionView) return sessionView;
  try {
    const stored = window.localStorage.getItem(VIEW_KEY);
    if (stored === "cards" || stored === "list") return stored;
  } catch {
    // Blocked storage: fall through to the device default.
  }
  // Cards on phones and with a finger; List with a mouse on a wider screen.
  const narrow = window.matchMedia("(max-width: 767px)").matches;
  const fine = window.matchMedia("(pointer: fine)").matches;
  return !narrow && fine ? "list" : "cards";
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

/** The remembered view; "cards" while the page is still on the server. */
export function useReviewView(): [ReviewView, (next: ReviewView) => void] {
  const view = useSyncExternalStore(subscribe, readView, () => "cards" as ReviewView);
  const set = (next: ReviewView) => {
    try {
      window.localStorage.setItem(VIEW_KEY, next);
    } catch {
      // Not remembered; the switch still works for this page.
    }
    sessionView = next;
    listeners.forEach((l) => l());
  };
  return [view, set];
}

/** True once the page is running in the browser (false while rendering on the server). */
export function useMounted(): boolean {
  return useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );
}

const positionKey = (planId: string) => `ledge:plan-review:${planId}`;

export function readPosition(planId: string): number {
  try {
    const raw = window.localStorage.getItem(positionKey(planId));
    const n = raw === null ? 0 : Number(raw);
    return Number.isInteger(n) && n >= 0 ? n : 0;
  } catch {
    return 0;
  }
}

export function writePosition(planId: string, index: number) {
  try {
    window.localStorage.setItem(positionKey(planId), String(index));
  } catch {
    // Not remembered.
  }
}

export function clearPosition(planId: string) {
  try {
    window.localStorage.removeItem(positionKey(planId));
  } catch {
    // Nothing to clear.
  }
}
