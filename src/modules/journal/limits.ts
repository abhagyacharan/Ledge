/**
 * Journal limits and choices (docs/journal-spec.md). Plain constants with no imports, so both the
 * database schema and the browser can use them.
 */

/** Longest journal page, in characters (about 15 pages of writing). */
export const MAX_JOURNAL_CHARS = 20_000;

/** The five moods, worst to best. The number is what is stored; mood is optional. */
export const MOODS = [
  { value: 1, label: "Rough" },
  { value: 2, label: "Low" },
  { value: 3, label: "Okay" },
  { value: 4, label: "Good" },
  { value: 5, label: "Great" },
] as const;

export const MOOD_MIN = 1;
export const MOOD_MAX = 5;
