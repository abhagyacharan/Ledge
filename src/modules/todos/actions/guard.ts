import "server-only";
import { revalidatePath } from "next/cache";
import type { z } from "zod";
import { fail, type Result } from "@/lib/result";
import { requireUser } from "@/server/session";
import { fieldErrorsFrom } from "../schema";

/**
 * Wraps every server action (CLAUDE.md §5, §9):
 *  1. requireUser(): redirects to /sign-in when there is no valid session,
 *  2. validates the input with Zod and returns field errors instead of throwing,
 *  3. passes the authenticated userId to the handler (never an id from the client),
 *  4. turns unexpected errors into a friendly result and logs them.
 */
export async function guarded<S extends z.ZodType, T>(
  schema: S,
  input: unknown,
  handler: (data: z.infer<S>, userId: string) => Promise<Result<T>>,
): Promise<Result<T>> {
  const { userId } = await requireUser();
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return fail("Check the highlighted fields.", fieldErrorsFrom(parsed.error));
  }
  try {
    return await handler(parsed.data, userId);
  } catch (error) {
    console.error("Server action failed:", error);
    return fail("Something went wrong. Try again.");
  }
}

/** Re-render everything inside the app shell after a change. */
export function refresh() {
  revalidatePath("/", "layout");
}

export const NOT_FOUND = "That item no longer exists.";
