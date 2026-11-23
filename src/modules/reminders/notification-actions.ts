"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { fail, ok } from "@/lib/result";
import { guarded, refresh } from "@/server/action-guard";
import {
  deleteSubscription,
  listLiveSubscriptions,
  saveSubscription,
  updateReminderSettings,
} from "@/server/data/reminders";
import { pushConfigured, sendToUser } from "@/server/push";
import { getSession } from "@/server/session";
import { pushSubscriptionSchema, reminderSettingsSchema } from "./schema";

/**
 * Settings › Notifications actions (docs/reminders-spec.md §2, §8). Each one checks the sign-in,
 * validates with Zod and filters by the signed-in user; nothing trusts an id from the browser.
 */

const OFF = "Reminders are not set up on this server.";

/** Saves this device's push subscription against the current sign-in session. */
export async function subscribePushAction(input: unknown) {
  return guarded(pushSubscriptionSchema, input, async (subscription, userId) => {
    if (!pushConfigured()) return fail(OFF);
    const session = await getSession();
    if (!session) return fail("Sign in again to turn on reminders.");
    const userAgent = (await headers()).get("user-agent");
    const row = await saveSubscription(userId, session.session.id, subscription, userAgent);
    if (!row) return fail("Sign in again to turn on reminders.");
    refresh();
    return ok({ id: row.id });
  });
}

/**
 * Which listed device is this browser? The browser sends its own push address and the match is
 * made here, so the list sent to the page never carries addresses. Null when none matches.
 */
export async function whichDeviceAction(endpoint: unknown) {
  return guarded(z.url().max(2048), endpoint, async (address, userId) => {
    const mine = (await listLiveSubscriptions(userId)).find((s) => s.endpoint === address);
    return ok({ id: mine?.id ?? null });
  });
}

/** Removes this device's subscription, found by its push address. Nothing to remove is fine. */
export async function unsubscribePushAction(input: unknown) {
  return guarded(z.object({ endpoint: z.url().max(2048) }), input, async ({ endpoint }, userId) => {
    const mine = (await listLiveSubscriptions(userId)).find((s) => s.endpoint === endpoint);
    if (mine) await deleteSubscription(userId, mine.id);
    refresh();
    return ok();
  });
}

/** Turns reminders off for one listed device. */
export async function removeDeviceAction(input: unknown) {
  return guarded(z.object({ id: z.uuid() }), input, async ({ id }, userId) => {
    const removed = await deleteSubscription(userId, id);
    if (!removed) return fail("That device is already off.");
    refresh();
    return ok();
  });
}

/** Sends a test notification to every device with reminders on. */
export async function sendTestNotificationAction() {
  return guarded(z.object({}), {}, async (_input, userId) => {
    if (!pushConfigured()) return fail(OFF);
    const counts = await sendToUser(userId, {
      type: "test",
      title: "Ledge reminders are on",
      body: "This is a test. Your reminders will look like this.",
      url: "/settings/notifications",
    });
    refresh();
    return ok({ sent: counts.sent, failed: counts.failed });
  });
}

/** Saves the default reminder, the morning time and quiet hours. */
export async function updateReminderSettingsAction(input: unknown) {
  return guarded(reminderSettingsSchema, input, async (settings, userId) => {
    if (!pushConfigured()) return fail(OFF);
    const saved = await updateReminderSettings(userId, settings);
    if (!saved) return fail("Couldn't save your settings.");
    refresh();
    return ok();
  });
}
