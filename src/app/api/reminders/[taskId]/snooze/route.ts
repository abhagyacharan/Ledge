import { json, reminderRequest, STALE, TASK_GONE } from "@/server/reminder-route";
import { snoozeReminder } from "@/server/reminders";

export const dynamic = "force-dynamic";

/**
 * POST /api/reminders/<taskId>/snooze: the notification's Snooze button (docs/reminders-spec.md
 * §7). The same reminder rings again in ten minutes. Optional JSON body `{ round }`. 401 when
 * signed out, 403 from another site, 404 for a task that is not this user's open task, 409 for a
 * stale round.
 */
export async function POST(request: Request, { params }: { params: Promise<{ taskId: string }> }) {
  const req = await reminderRequest(request, params);
  if (!req.ok) return req.response;
  const until = await snoozeReminder(req.userId, req.taskId, new Date(), req.round);
  if (!until) return json({ ok: false, error: TASK_GONE }, 404);
  if (until === STALE) return json({ ok: false, error: STALE }, 409);
  return json({ ok: true, until: until.toISOString() });
}
