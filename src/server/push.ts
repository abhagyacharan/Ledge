import "server-only";
import { sendNotification } from "web-push";
import { eq, sql } from "drizzle-orm";
import { getPushConfig } from "@/server/env";
import { listLiveSubscriptions } from "@/server/data/reminders";
import { db } from "@/server/db/client";
import { pushSubscriptions, type PushSubscriptionRow } from "@/server/db/schema";

/**
 * Web Push sender (docs/reminders-spec.md §2, §8). The title and body travel encrypted; the push
 * service only sees a blob. Without the three VAPID settings reminders are off.
 */

export type PushPayload =
  | {
      type: "reminder";
      taskId: string;
      title: string;
      body: string;
      url: string;
      tag: string;
      late: boolean;
    }
  | { type: "test"; title: string; body: string; url: string };

export type PushResult = "ok" | "gone" | "failed";

/** Failures in a row after which a subscription is deleted. */
export const MAX_PUSH_FAILURES = 5;

export function pushConfigured(): boolean {
  return getPushConfig() !== null;
}

/** The public key the browser needs to subscribe, or null when reminders are off. */
export function vapidPublicKey(): string | null {
  return getPushConfig()?.publicKey ?? null;
}

type Target = Pick<PushSubscriptionRow, "endpoint" | "p256dh" | "auth">;

export async function sendPush(subscription: Target, payload: PushPayload): Promise<PushResult> {
  const config = getPushConfig();
  if (!config) return "failed";
  try {
    await sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      },
      JSON.stringify(payload),
      {
        TTL: 3600,
        urgency: "high",
        timeout: 10_000,
        vapidDetails: {
          subject: config.subject,
          publicKey: config.publicKey,
          privateKey: config.privateKey,
        },
      },
    );
    return "ok";
  } catch (error) {
    const status = (error as { statusCode?: unknown } | null)?.statusCode;
    return status === 404 || status === 410 ? "gone" : "failed";
  }
}

export type SendCounts = { sent: number; failed: number; removed: number };

/**
 * Sends to every live subscription of the user in parallel. Records success, counts failures,
 * deletes a subscription that is gone or has failed five times in a row.
 */
export async function sendToUser(userId: string, payload: PushPayload): Promise<SendCounts> {
  const counts: SendCounts = { sent: 0, failed: 0, removed: 0 };
  if (!pushConfigured()) return counts;
  const subs = await listLiveSubscriptions(userId);
  await Promise.all(
    subs.map(async (sub) => {
      const result = await sendPush(sub, payload);
      if (result === "ok") {
        counts.sent += 1;
        await db
          .update(pushSubscriptions)
          .set({ failures: 0, lastSuccessAt: new Date() })
          .where(eq(pushSubscriptions.id, sub.id));
        return;
      }
      counts.failed += 1;
      if (result === "gone") {
        await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, sub.id));
        counts.removed += 1;
        return;
      }
      const [row] = await db
        .update(pushSubscriptions)
        .set({ failures: sql`${pushSubscriptions.failures} + 1` })
        .where(eq(pushSubscriptions.id, sub.id))
        .returning({ failures: pushSubscriptions.failures });
      if (row && row.failures >= MAX_PUSH_FAILURES) {
        await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, sub.id));
        counts.removed += 1;
      }
    }),
  );
  return counts;
}
