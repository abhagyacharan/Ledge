import { eq, sql } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";

const sendNotification = vi.hoisted(() => vi.fn());
vi.mock("web-push", () => ({ default: { sendNotification }, sendNotification }));

import {
  clearTaskReminder,
  deleteSubscription,
  getReminderSettings,
  getTaskReminder,
  listLiveSubscriptions,
  saveSubscription,
  setTaskReminder,
  updateReminderSettings,
} from "@/server/data/reminders";
import { exportEverything } from "@/server/data/export";
import { db } from "@/server/db/client";
import { pushSubscriptions, session, taskReminders, userSettings } from "@/server/db/schema";
import { sendToUser } from "@/server/push";
import { makeList, makeTask } from "../helpers/data";
import { createUser, resetAuthData, type TestUser } from "../helpers/fast-users";

/**
 * Reminder data and the push sender (docs/reminders-spec.md). User B must not read, set or clear
 * A's reminders, nor delete A's subscriptions. Web Push itself is mocked.
 */

let a: TestUser;
let b: TestUser;
let aTaskId: string;
let bTaskId: string;
let aSessionId: string;
let n = 0;

async function makeSession(userId: string, expiresAt: Date): Promise<string> {
  n += 1;
  const [row] = await db
    .insert(session)
    .values({ userId, token: `token-${n}-${Date.now()}`, expiresAt })
    .returning({ id: session.id });
  return row.id;
}

const inAMonth = () => new Date(Date.now() + 30 * 86_400_000);
const sub = (name: string) => ({
  endpoint: `https://push.example/${name}`,
  keys: { p256dh: "p256dh-key", auth: "auth-key" },
});
const payload = {
  type: "test",
  title: "Hi",
  body: "Test",
  url: "/settings/notifications",
} as const;

beforeEach(async () => {
  process.env.ALLOW_SIGNUP = "true";
  process.env.VAPID_PUBLIC_KEY = "public";
  process.env.VAPID_PRIVATE_KEY = "private";
  process.env.VAPID_SUBJECT = "mailto:test@example.com";
  sendNotification.mockReset();
  await resetAuthData();
  a = await createUser("a@example.com", "A");
  b = await createUser("b@example.com", "B");
  aTaskId = (await makeTask(a.id, (await makeList(a.id, "A")).id, "A task")).id;
  bTaskId = (await makeTask(b.id, (await makeList(b.id, "B")).id, "B task")).id;
  aSessionId = await makeSession(a.id, inAMonth());
});

describe("task reminders", () => {
  it("sets, reads and clears the owner's reminder", async () => {
    const row = await setTaskReminder(a.id, aTaskId, { kind: "before", offsetMinutes: 30 });
    expect(row).toMatchObject({ kind: "before", offsetMinutes: 30 });
    expect(await getTaskReminder(a.id, aTaskId)).toMatchObject({ kind: "before" });
    const custom = await setTaskReminder(a.id, aTaskId, {
      kind: "custom",
      date: "2026-12-01",
      time: "08:15",
    });
    expect(custom).toMatchObject({ kind: "custom", customDate: "2026-12-01", offsetMinutes: null });
    expect(await clearTaskReminder(a.id, aTaskId)).toBe(true);
    expect(await getTaskReminder(a.id, aTaskId)).toBeNull();
  });

  it("a changed choice forgets sent_key and snooze; the same choice keeps them", async () => {
    await setTaskReminder(a.id, aTaskId, { kind: "at_due" });
    await db
      .update(taskReminders)
      .set({ sentKey: "k", snoozedUntil: new Date() })
      .where(eq(taskReminders.taskId, aTaskId));
    await setTaskReminder(a.id, aTaskId, { kind: "at_due" });
    expect((await getTaskReminder(a.id, aTaskId))?.sentKey).toBe("k");
    await setTaskReminder(a.id, aTaskId, { kind: "before", offsetMinutes: 5 });
    const row = await getTaskReminder(a.id, aTaskId);
    expect(row?.sentKey).toBeNull();
    expect(row?.snoozedUntil).toBeNull();
  });

  it("B cannot read, set or clear A's reminder", async () => {
    await setTaskReminder(a.id, aTaskId, { kind: "at_due" });
    expect(await getTaskReminder(b.id, aTaskId)).toBeNull();
    expect(await setTaskReminder(b.id, aTaskId, { kind: "before", offsetMinutes: 5 })).toBeNull();
    expect(await clearTaskReminder(b.id, aTaskId)).toBe(false);
    expect(await getTaskReminder(a.id, aTaskId)).toMatchObject({ kind: "at_due" });
    expect(await getTaskReminder(a.id, bTaskId)).toBeNull();
    expect(await setTaskReminder(a.id, bTaskId, { kind: "at_due" })).toBeNull();
  });

  it("the database refuses a before reminder with a stray offset", async () => {
    await expect(
      db
        .insert(taskReminders)
        .values({ userId: a.id, taskId: aTaskId, kind: "at_due", offsetMinutes: 5 }),
    ).rejects.toThrow();
    await expect(
      db
        .insert(taskReminders)
        .values({ userId: a.id, taskId: aTaskId, kind: "before", offsetMinutes: 7 }),
    ).rejects.toThrow();
  });

  it("deleting the task deletes its reminder", async () => {
    await setTaskReminder(a.id, aTaskId, { kind: "at_due" });
    await db.execute(sql`delete from tasks where id = ${aTaskId}`);
    expect(await getTaskReminder(a.id, aTaskId)).toBeNull();
  });
});

describe("reminder settings", () => {
  it("sets reminder_default_since only when the default changes", async () => {
    const start = await getReminderSettings(a.id);
    expect(start).toMatchObject({ reminderDefault: "none", reminderDefaultSince: null });
    const first = await updateReminderSettings(a.id, {
      reminderDefault: "before:15",
      reminderMorningTime: "08:00",
      quietStart: "23:00",
      quietEnd: "07:00",
    });
    expect(first?.reminderDefaultSince).toBeInstanceOf(Date);
    const since = first?.reminderDefaultSince?.getTime();
    const second = await updateReminderSettings(a.id, {
      reminderDefault: "before:15",
      reminderMorningTime: "10:00",
      quietStart: null,
      quietEnd: null,
    });
    expect(second?.reminderDefaultSince?.getTime()).toBe(since);
    expect(second).toMatchObject({ quietStart: null, quietEnd: null });
    expect(second?.reminderMorningTime.slice(0, 5)).toBe("10:00");
  });

  it("the database refuses half a quiet window or an odd default", async () => {
    await expect(
      db.update(userSettings).set({ quietStart: "22:00" }).where(eq(userSettings.userId, a.id)),
    ).rejects.toThrow();
    await expect(
      db
        .update(userSettings)
        .set({ reminderDefault: "before:7" })
        .where(eq(userSettings.userId, a.id)),
    ).rejects.toThrow();
  });
});

describe("push subscriptions", () => {
  it("saves by endpoint and moves it to the new user and session", async () => {
    const first = await saveSubscription(
      a.id,
      aSessionId,
      sub("one"),
      "Mozilla/5.0 (Linux; Android 14; Pixel) Mobile Chrome/120",
    );
    expect(first?.deviceLabel).toBe("Chrome on Android");
    const bSession = await makeSession(b.id, inAMonth());
    const moved = await saveSubscription(b.id, bSession, sub("one"), null);
    expect(moved?.id).toBe(first?.id);
    expect(moved).toMatchObject({ userId: b.id, sessionId: bSession });
    expect(await listLiveSubscriptions(a.id)).toHaveLength(0);
    expect(await listLiveSubscriptions(b.id)).toHaveLength(1);
  });

  it("refuses a session that is not the user's", async () => {
    expect(await saveSubscription(b.id, aSessionId, sub("x"), null)).toBeNull();
  });

  it("B cannot delete A's subscription", async () => {
    const row = await saveSubscription(a.id, aSessionId, sub("mine"), null);
    expect(await deleteSubscription(b.id, row!.id)).toBe(false);
    expect(await listLiveSubscriptions(a.id)).toHaveLength(1);
    expect(await deleteSubscription(a.id, row!.id)).toBe(true);
    expect(await listLiveSubscriptions(a.id)).toHaveLength(0);
  });

  it("deleting the session deletes its subscriptions", async () => {
    await saveSubscription(a.id, aSessionId, sub("gone-with-session"), null);
    await db.delete(session).where(eq(session.id, aSessionId));
    expect(await db.select().from(pushSubscriptions)).toHaveLength(0);
  });

  it("listLiveSubscriptions skips expired sessions", async () => {
    const expired = await makeSession(a.id, new Date(Date.now() - 60_000));
    await saveSubscription(a.id, aSessionId, sub("live"), null);
    await saveSubscription(a.id, expired, sub("expired"), null);
    const live = await listLiveSubscriptions(a.id);
    expect(live.map((s) => s.endpoint)).toEqual(["https://push.example/live"]);
  });
});

describe("sendToUser", () => {
  it("sends to every live device and records success", async () => {
    await saveSubscription(a.id, aSessionId, sub("p1"), null);
    await saveSubscription(a.id, aSessionId, sub("p2"), null);
    sendNotification.mockResolvedValue({ statusCode: 201 });
    const counts = await sendToUser(a.id, payload);
    expect(counts).toEqual({ sent: 2, failed: 0, removed: 0 });
    expect(sendNotification).toHaveBeenCalledTimes(2);
    const options = sendNotification.mock.calls[0][2];
    expect(options).toMatchObject({ TTL: 3600, urgency: "high", timeout: 10_000 });
    const rows = await db.select().from(pushSubscriptions);
    expect(rows.every((r) => r.lastSuccessAt !== null && r.failures === 0)).toBe(true);
  });

  it("prunes a subscription the push service reports gone (410)", async () => {
    await saveSubscription(a.id, aSessionId, sub("dead"), null);
    await saveSubscription(a.id, aSessionId, sub("alive"), null);
    sendNotification.mockImplementation(async (s: { endpoint: string }) => {
      if (s.endpoint.endsWith("dead")) throw Object.assign(new Error("Gone"), { statusCode: 410 });
      return { statusCode: 201 };
    });
    const counts = await sendToUser(a.id, payload);
    expect(counts).toEqual({ sent: 1, failed: 1, removed: 1 });
    const left = await db.select().from(pushSubscriptions);
    expect(left.map((r) => r.endpoint)).toEqual(["https://push.example/alive"]);
  });

  it("counts failures and deletes at the fifth in a row", async () => {
    await saveSubscription(a.id, aSessionId, sub("flaky"), null);
    sendNotification.mockRejectedValue(Object.assign(new Error("boom"), { statusCode: 500 }));
    for (let i = 1; i <= 4; i += 1) {
      expect(await sendToUser(a.id, payload)).toMatchObject({ failed: 1, removed: 0 });
      const [row] = await db.select().from(pushSubscriptions);
      expect(row.failures).toBe(i);
    }
    expect(await sendToUser(a.id, payload)).toMatchObject({ failed: 1, removed: 1 });
    expect(await db.select().from(pushSubscriptions)).toHaveLength(0);
  });

  it("does nothing without VAPID settings", async () => {
    delete process.env.VAPID_PRIVATE_KEY;
    await saveSubscription(a.id, aSessionId, sub("off"), null);
    expect(await sendToUser(a.id, payload)).toEqual({ sent: 0, failed: 0, removed: 0 });
    expect(sendNotification).not.toHaveBeenCalled();
  });
});

describe("export", () => {
  it("includes reminders and settings but never endpoints or keys", async () => {
    await setTaskReminder(a.id, aTaskId, { kind: "at_due" });
    await saveSubscription(a.id, aSessionId, sub("secret-endpoint"), null);
    const data = await exportEverything(a.id);
    expect(data.taskReminders).toHaveLength(1);
    expect(data.settings).toHaveProperty("reminderDefault");
    const text = JSON.stringify(data);
    expect(text).not.toContain("secret-endpoint");
    expect(text).not.toContain("p256dh-key");
    expect(text).not.toContain("auth-key");
  });
});
