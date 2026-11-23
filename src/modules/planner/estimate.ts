import { MAX_ESTIMATE, MIN_ESTIMATE } from "./schema";

/**
 * The time estimate lives in a task's notes as a first line (docs/plans-module-spec.md §3), so a
 * plan task stays an ordinary task. Format: "About 45 min", "About 1 hr", "About 1 hr 30 min",
 * "About 2 hr". `parseEstimateLine` reads it back; both are pure.
 */

export function formatEstimateLine(minutes: number): string {
  const total = Math.min(MAX_ESTIMATE, Math.max(MIN_ESTIMATE, Math.round(minutes)));
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  if (hours === 0) return `About ${rest} min`;
  return rest === 0 ? `About ${hours} hr` : `About ${hours} hr ${rest} min`;
}

const LINE = /^About (?:(\d{1,2}) hr)?(?: ?(\d{1,2}) min)?$/;

/** The estimate in a task's notes (its first line) and the notes without that line. */
export function parseEstimateLine(notes: string | null | undefined): {
  minutes: number | null;
  rest: string;
} {
  const text = (notes ?? "").replace(/\r\n/g, "\n");
  const [first = "", ...others] = text.split("\n");
  const match = LINE.exec(first.trim());
  if (match && (match[1] !== undefined || match[2] !== undefined)) {
    const minutes = Number(match[1] ?? 0) * 60 + Number(match[2] ?? 0);
    if (minutes >= MIN_ESTIMATE && minutes <= MAX_ESTIMATE) {
      return { minutes, rest: others.join("\n").trim() };
    }
  }
  return { minutes: null, rest: text.trim() };
}

/** The notes to store: the estimate line, a blank line, then the notes. Null when both are empty. */
export function composeNotes(estimateMinutes: number | null, notes: string): string | null {
  const body = notes.trim();
  const line = estimateMinutes === null ? null : formatEstimateLine(estimateMinutes);
  if (line && body) return `${line}\n\n${body}`;
  return line ?? (body || null);
}
