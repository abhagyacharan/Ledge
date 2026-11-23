import { revalidatePath } from "next/cache";
import { json, reminderRequest, TASK_GONE } from "@/server/reminder-route";
import { completeFromReminder } from "@/server/reminders";

export const dynamic = "force-dynamic";

/**
 * POST /api/reminders/<taskId>/done: the notification's Done button (docs/reminders-spec.md §7).
 * Ticks the task the same way the app does; a repeating task moves to its next round. 401 when
 * signed out, 404 for a task that is not this user's, 409 for a repeat whose day has not come.
 */
export async function POST(_request: Request, { params }: { params: Promise<{ taskId: string }> }) {
  const req = await reminderRequest(params);
  if (!req.ok) return req.response;
  const result = await completeFromReminder(req.userId, req.taskId, new Date());
  if (result === "not_found") return json({ ok: false, error: TASK_GONE }, 404);
  if (result === "too_early") {
    return json(
      { ok: false, error: "This repeat isn't due yet. You can tick it on its day." },
      409,
    );
  }
  revalidatePath("/", "layout");
  return json({ ok: true });
}
