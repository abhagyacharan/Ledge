import { fail, type Result } from "@/lib/result";

/** Awaits a server action; a network failure becomes a plain result instead of a throw. */
export async function call<T>(action: Promise<Result<T>>): Promise<Result<T>> {
  try {
    return await action;
  } catch {
    return fail("Couldn't reach the server. Check your connection and try again.");
  }
}

/** The error to show for a result: null when it worked. */
export function problemOf<T>(result: Result<T>): string | null {
  return result.ok ? null : result.error;
}
