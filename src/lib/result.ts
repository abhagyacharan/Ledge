/**
 * Server actions return this instead of throwing for expected failures (CLAUDE.md §9).
 * `fieldErrors` maps a field name to a message, for forms.
 */
export type Result<T = void> =
  { ok: true; data: T } | { ok: false; error: string; fieldErrors?: Record<string, string> };

export function ok(): Result<void>;
export function ok<T>(data: T): Result<T>;
export function ok<T>(data?: T): Result<T | undefined> {
  return { ok: true, data };
}

export function fail(error: string, fieldErrors?: Record<string, string>): Result<never> {
  return { ok: false, error, fieldErrors };
}
