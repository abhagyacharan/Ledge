import "server-only";
import { z } from "zod";
import { getSession } from "@/server/session";

/**
 * Shared by the service worker's Done and Snooze routes (docs/reminders-spec.md §7, §13): the
 * signed-in user and a checked task id, or the JSON answer to send instead.
 */

const taskIdSchema = z.uuid();

export const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

export const TASK_GONE = "That task no longer exists.";

export async function reminderRequest(
  params: Promise<{ taskId: string }>,
): Promise<{ ok: true; userId: string; taskId: string } | { ok: false; response: Response }> {
  const session = await getSession();
  if (!session) {
    return { ok: false, response: json({ ok: false, error: "Sign in again." }, 401) };
  }
  const parsed = taskIdSchema.safeParse((await params).taskId);
  if (!parsed.success) {
    return { ok: false, response: json({ ok: false, error: TASK_GONE }, 404) };
  }
  return { ok: true, userId: session.user.id, taskId: parsed.data };
}
