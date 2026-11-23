import { json, reminderRequest, TASK_GONE } from "@/server/reminder-route";
import { snoozeReminder } from "@/server/reminders";

export const dynamic = "force-dynamic";

/**
 * POST /api/reminders/<taskId>/snooze: the notification's Snooze button (docs/reminders-spec.md
 * §7). The same reminder rings again in ten minutes. 401 when signed out, 404 for a task that is
 * not this user's open task.
 */
export async function POST(_request: Request, { params }: { params: Promise<{ taskId: string }> }) {
  const req = await reminderRequest(params);
  if (!req.ok) return req.response;
  const until = await snoozeReminder(req.userId, req.taskId, new Date());
  if (!until) return json({ ok: false, error: TASK_GONE }, 404);
  return json({ ok: true, until: until.toISOString() });
}
