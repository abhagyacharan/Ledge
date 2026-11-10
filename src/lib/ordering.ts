import { generateKeyBetween } from "fractional-indexing";

/**
 * Helpers around fractional indexing (CLAUDE.md §3). A position is a short string; inserting
 * between two neighbours invents a string that sorts between them, so only the moved row changes.
 */

type Positioned = { id: string; position: string };

/** Position between two neighbours. Pass null for "no neighbour on that side". */
export function positionBetween(before: string | null, after: string | null): string {
  return generateKeyBetween(before, after);
}

/** Position that sorts after everything (`last` is the current last position, if any). */
export function positionAtEnd(last: string | null): string {
  return generateKeyBetween(last, null);
}

/** Orders by position. Positions are compared as plain strings, never locale-aware. */
export function sortByPosition<T extends { position: string }>(items: T[]): T[] {
  return [...items].sort((a, b) =>
    a.position < b.position ? -1 : a.position > b.position ? 1 : 0,
  );
}

/**
 * New position that places item `id` one step up or down among its siblings,
 * or null when it is already at that edge (or not found).
 */
export function positionForStep(
  siblings: Positioned[],
  id: string,
  direction: "up" | "down",
): string | null {
  const sorted = sortByPosition(siblings);
  const index = sorted.findIndex((s) => s.id === id);
  if (index === -1) return null;
  if (direction === "up") {
    if (index === 0) return null;
    return positionBetween(sorted[index - 2]?.position ?? null, sorted[index - 1].position);
  }
  if (index === sorted.length - 1) return null;
  return positionBetween(sorted[index + 1].position, sorted[index + 2]?.position ?? null);
}

/**
 * New position that places item `id` at `targetIndex` among the other siblings
 * (the item itself is ignored when counting). Used by drag and drop in Phase 4.
 */
export function positionForIndex(siblings: Positioned[], id: string, targetIndex: number): string {
  const others = sortByPosition(siblings.filter((s) => s.id !== id));
  const clamped = Math.max(0, Math.min(targetIndex, others.length));
  return positionBetween(others[clamped - 1]?.position ?? null, others[clamped]?.position ?? null);
}
