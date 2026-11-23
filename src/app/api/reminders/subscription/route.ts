import { z } from "zod";
import { pushSubscriptionSchema } from "@/modules/reminders/schema";
import { deleteSubscriptionByEndpoint, saveSubscription } from "@/server/data/reminders";
import { json, readJson, routeSession } from "@/server/reminder-route";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  oldEndpoint: z.string().max(2048).optional(),
  subscription: pushSubscriptionSchema,
});

/**
 * POST /api/reminders/subscription: the service worker's `pushsubscriptionchange`
 * (docs/reminders-spec.md §8). Saves the browser's new subscription for this user and sign-in,
 * and removes the old one if it was this user's. 200, 400 for a bad body or push address, 401
 * when signed out, 403 from another site.
 */
export async function POST(request: Request) {
  const req = await routeSession(request);
  if (!req.ok) return req.response;
  let body: unknown;
  try {
    body = await readJson(request);
  } catch {
    body = undefined;
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return json({ ok: false, error: "Bad request." }, 400);
  const { oldEndpoint, subscription } = parsed.data;
  const saved = await saveSubscription(
    req.userId,
    req.sessionId,
    subscription,
    request.headers.get("user-agent"),
  );
  if (!saved) return json({ ok: false, error: "Bad request." }, 400);
  if (oldEndpoint && oldEndpoint !== subscription.endpoint) {
    await deleteSubscriptionByEndpoint(req.userId, oldEndpoint);
  }
  return json({ ok: true });
}
