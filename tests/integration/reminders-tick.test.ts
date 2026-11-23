import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("web-push", async () => (await import("../helpers/web-push-mock")).webPushModule);
vi.mock("@/server/session", async () => (await import("../helpers/action-session")).sessionModule);
vi.mock("next/headers", async () => (await import("../helpers/action-session")).headersModule);
vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));

import { POST as donePost } from "@/app/api/reminders/[taskId]/done/route";
import { POST as snoozePost } from "@/app/api/reminders/[taskId]/snooze/route";
import { POST as subscriptionPost } from "@/app/api/reminders/subscription/route";
import { saveSubscription, setTaskReminder } from "@/server/data/reminders";
import { completeRecurringTask, getTask, setTaskDone, updateTask } from "@/server/data/tasks";
import { db } from "@/server/db/client";
import { pushSubscriptions, session, taskReminders, tasks, userSettings } from "@/server/db/schema";
import { runReminderTick, snoozeReminder } from "@/server/reminders";
import { testAuth } from "../helpers/action-session";
import { sendNotification } from "../helpers/web-push-mock";
import { makeList, makeTask } from "../helpers/data";
import { createUser, resetAuthData, type TestUser } from "../helpers/fast-users";

/**
 * The reminder scheduler (docs/reminders-spec.md §9) with a fixed clock and Web Push mocked, and
 * the service worker's Done and Snooze routes. The clock is far ahead of real time so rows the
 * database stamps with the real time (created, updated) always look older than the reminders.
 */

const MIN = 60_000;
/** 10 June 2030, 17:00 in Asia/Kolkata (the default timezone). */
const NOW = new Date("2030-06-10T11:30:00Z");
const at = (minutes: number) => new Date(NOW.getTime() + minutes * MIN);
const DAY = "2030-06-10";

let a: TestUser;
let b: TestUser;
let list: Awaited<ReturnType<typeof makeList>>;
let n = 0;

async function subscribe(userId: string, expiresAt: Date) {
  n += 1;
  const [row] = await db
    .insert(session)
    .values({ userId, token: `tick-${n}-${Date.now()}`, expiresAt })
    .returning({ id: session.id });
  await saveSubscription(
    userId,
    row.id,
    { endpoint: `https://fcm.googleapis.com/fcm/send/${n}`, keys: { p256dh: "k", auth: "a" } },
    null,
  );
}

const sentPayloads = () =>
  sendNotification.mock.calls.map(
    (call) => JSON.parse(String(call[1])) as { title: string; body: string; late: boolean },
  );

const task = (title: string, overrides = {}) =>
  makeTask(a.id, list.id, title, { dueDate: DAY, dueTime: "17:00", ...overrides });

const params = (taskId: string) => ({ params: Promise.resolve({ taskId }) });
const post = (
  body?: unknown,
  headers: Record<string, string> = { "sec-fetch-site": "same-origin" },
) =>
  new Request("http://localhost:3000/api/reminders", {
    method: "POST",
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

beforeEach(async () => {
  process.env.ALLOW_SIGNUP = "true";
  process.env.VAPID_PUBLIC_KEY = "public";
  process.env.VAPID_PRIVATE_KEY = "private";
  process.env.VAPID_SUBJECT = "mailto:test@example.com";
  sendNotification.mockReset();
  sendNotification.mockResolvedValue({ statusCode: 201 });
  await resetAuthData();
  a = await createUser("a@example.com", "A");
  b = await createUser("b@example.com", "B");
  list = await makeList(a.id, "Home");
  await subscribe(a.id, new Date("2099-01-01T00:00:00Z"));
  testAuth.reset(a.id);
});

describe("sending once", () => {
  it("sends at the moment, once across two ticks", async () => {
    const t = await task("Pay rent");
    await setTaskReminder(a.id, t.id, { kind: "at_due" });
    expect((await runReminderTick(at(-1))).sent).toBe(0);
    expect((await runReminderTick(NOW)).sent).toBe(1);
    expect((await runReminderTick(at(0.5))).sent).toBe(0);
    expect(sendNotification).toHaveBeenCalledTimes(1);
    const [payload] = sendNotification.mock.calls.map((c) => JSON.parse(String(c[1])));
    expect(payload).toEqual({
      type: "reminder",
      taskId: t.id,
      title: "Pay rent",
      body: "Due 5:00 pm · Home",
      url: `/today?task=${t.id}`,
      tag: t.id,
      late: false,
      round: DAY,
    });
  });

  it("sends once across two concurrent ticks", async () => {
    const t = await task("Call the bank");
    await setTaskReminder(a.id, t.id, { kind: "before", offsetMinutes: 30 });
    const [one, two] = await Promise.all([runReminderTick(at(-30)), runReminderTick(at(-30))]);
    expect(one.sent + two.sent).toBe(1);
    expect(sendNotification).toHaveBeenCalledTimes(1);
  });

  it("re-arms when the due date moves", async () => {
    const t = await task("Water plants");
    await setTaskReminder(a.id, t.id, { kind: "at_due" });
    await runReminderTick(NOW);
    await updateTask(a.id, t.id, { dueDate: "2030-06-11" });
    expect((await runReminderTick(at(1))).sent).toBe(0);
    expect((await runReminderTick(at(24 * 60))).sent).toBe(1);
    expect(sendNotification).toHaveBeenCalledTimes(2);
  });

  it("re-arms for the next round of a repeating task", async () => {
    const t = await task("Skincare", { recurrenceRule: "FREQ=DAILY" });
    await setTaskReminder(a.id, t.id, { kind: "at_due" });
    await runReminderTick(NOW);
    await completeRecurringTask(a.id, t.id, DAY);
    expect((await getTask(a.id, t.id))?.dueDate).toBe("2030-06-11");
    expect((await runReminderTick(at(60))).sent).toBe(0);
    expect((await runReminderTick(at(24 * 60))).sent).toBe(1);
  });

  it("sends a date-only task at the morning time", async () => {
    const t = await task("Renew passport", { dueTime: null });
    await setTaskReminder(a.id, t.id, { kind: "at_due" });
    // 09:00 IST is 03:30 UTC, eight hours before NOW.
    expect((await runReminderTick(at(-8 * 60 - 1))).sent).toBe(0);
    expect((await runReminderTick(at(-8 * 60))).sent).toBe(1);
    expect(sentPayloads()[0].body).toBe("Due today · Home");
  });
});

describe("the default reminder", () => {
  beforeEach(async () => {
    await db
      .update(userSettings)
      .set({ reminderDefault: "before:30", reminderDefaultSince: new Date("2030-06-01T00:00:00Z") })
      .where(eq(userSettings.userId, a.id));
  });

  it("applies only to timed tasks created after it was set", async () => {
    await task("New", { createdAt: new Date("2030-06-05T00:00:00Z") });
    await task("Old", { createdAt: new Date("2030-05-01T00:00:00Z") });
    await task("No time", { dueTime: null, createdAt: new Date("2030-06-05T00:00:00Z") });
    const counts = await runReminderTick(at(-30));
    expect(counts.sent).toBe(1);
    expect(sentPayloads().map((p) => p.title)).toEqual(["New"]);
    expect((await runReminderTick(at(-29))).sent).toBe(0);
  });

  it("None on the task stops it", async () => {
    const t = await task("Muted", { createdAt: new Date("2030-06-05T00:00:00Z") });
    await setTaskReminder(a.id, t.id, { kind: "none" });
    expect((await runReminderTick(at(-30))).sent).toBe(0);
    expect(sendNotification).not.toHaveBeenCalled();
  });
});

describe("late and held reminders", () => {
  it("sends up to six hours late, marked late, and skips older ones silently", async () => {
    const recent = await task("Recent");
    const old = await task("Old", { dueTime: "05:00" });
    await setTaskReminder(a.id, recent.id, { kind: "at_due" });
    await setTaskReminder(a.id, old.id, { kind: "at_due" });
    const counts = await runReminderTick(at(120));
    expect(counts).toMatchObject({ sent: 1, late: 1, skipped: 1 });
    expect(sentPayloads()).toEqual([
      expect.objectContaining({
        title: "Recent",
        body: "Overdue since 5:00 pm · Home",
        late: true,
      }),
    ]);
    expect((await runReminderTick(at(121))).sent).toBe(0);
    const [row] = await db.select().from(taskReminders).where(eq(taskReminders.taskId, old.id));
    expect(row.sentKey).not.toBeNull();
  });

  it("holds a reminder during quiet hours and sends it when they end", async () => {
    await db
      .update(userSettings)
      .set({ quietStart: "16:00", quietEnd: "18:00" })
      .where(eq(userSettings.userId, a.id));
    const t = await task("Quiet");
    await setTaskReminder(a.id, t.id, { kind: "at_due" });
    expect((await runReminderTick(NOW)).sent).toBe(0);
    expect((await runReminderTick(at(59))).sent).toBe(0);
    expect((await runReminderTick(at(60))).sent).toBe(1);
    expect(sentPayloads()[0].body).toBe("Overdue since 5:00 pm · Home · Held during quiet hours");
  });

  it("sends nothing to a device whose sign-in has expired", async () => {
    const c = await createUser("c@example.com", "C");
    const cList = await makeList(c.id, "C");
    const t = await makeTask(c.id, cList.id, "C task", { dueDate: DAY, dueTime: "17:00" });
    await subscribe(c.id, new Date("2000-01-01T00:00:00Z"));
    await setTaskReminder(c.id, t.id, { kind: "at_due" });
    expect((await runReminderTick(NOW)).sent).toBe(0);
    expect(sendNotification).not.toHaveBeenCalled();
  });
});

describe("snooze", () => {
  it("sends the same reminder again ten minutes later", async () => {
    const t = await task("Stretch");
    await setTaskReminder(a.id, t.id, { kind: "at_due" });
    await runReminderTick(NOW);
    expect(await snoozeReminder(a.id, t.id, at(1))).toEqual(at(11));
    expect((await runReminderTick(at(5))).sent).toBe(0);
    expect(await runReminderTick(at(11))).toMatchObject({ sent: 1, snoozed: 1 });
    expect((await runReminderTick(at(12))).sent).toBe(0);
    expect(sendNotification).toHaveBeenCalledTimes(2);
    const [row] = await db.select().from(taskReminders).where(eq(taskReminders.taskId, t.id));
    expect(row.snoozedUntil).toBeNull();
  });

  it("snoozing a default reminder keeps this round sent", async () => {
    await db
      .update(userSettings)
      .set({ reminderDefault: "at_due", reminderDefaultSince: new Date("2030-06-01T00:00:00Z") })
      .where(eq(userSettings.userId, a.id));
    const t = await task("Default", { createdAt: new Date("2030-06-05T00:00:00Z") });
    expect((await runReminderTick(NOW)).sent).toBe(1);
    await db.delete(taskReminders).where(eq(taskReminders.taskId, t.id));
    await snoozeReminder(a.id, t.id, at(1));
    expect((await runReminderTick(at(2))).sent).toBe(0);
    expect((await runReminderTick(at(11))).sent).toBe(1);
    expect((await runReminderTick(at(12))).sent).toBe(0);
  });
});

describe("Done and Snooze routes", () => {
  it("Done ticks the user's own task", async () => {
    const t = await task("Done me");
    const res = await donePost(post(), params(t.id));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect((await getTask(a.id, t.id))?.status).toBe("done");
  });

  it("Done refuses a repeat whose day has not come", async () => {
    const t = await task("Later", { recurrenceRule: "FREQ=DAILY" });
    const res = await donePost(post(), params(t.id));
    expect(res.status).toBe(409);
    expect((await getTask(a.id, t.id))?.dueDate).toBe(DAY);
  });

  it("Snooze sets the snooze on the user's own task", async () => {
    const t = await task("Snooze me");
    await setTaskReminder(a.id, t.id, { kind: "at_due" });
    const res = await snoozePost(post(), params(t.id));
    expect(res.status).toBe(200);
    const [row] = await db.select().from(taskReminders).where(eq(taskReminders.taskId, t.id));
    expect(row.snoozedUntil).toBeInstanceOf(Date);
  });

  it("both refuse another user's task with 404", async () => {
    const t = await task("Mine");
    testAuth.reset(b.id);
    expect((await donePost(post(), params(t.id))).status).toBe(404);
    expect((await snoozePost(post(), params(t.id))).status).toBe(404);
    expect((await getTask(a.id, t.id))?.status).toBe("open");
    expect(await db.select().from(taskReminders)).toHaveLength(0);
  });

  it("both answer 401 when signed out, and 404 for a bad id", async () => {
    const t = await task("Signed out");
    testAuth.reset("");
    const done = await donePost(post(), params(t.id));
    expect(done.status).toBe(401);
    expect(await done.json()).toMatchObject({ ok: false });
    expect((await snoozePost(post(), params(t.id))).status).toBe(401);
    testAuth.reset(a.id);
    expect((await donePost(post(), params("not-a-uuid"))).status).toBe(404);
    expect((await getTask(a.id, t.id))?.status).toBe("open");
  });
});

describe("snooze and the round it was pressed on", () => {
  it("is dropped when the round is ticked in the app, and the next round still rings", async () => {
    const t = await task("Meds", { recurrenceRule: "FREQ=DAILY" });
    await setTaskReminder(a.id, t.id, { kind: "at_due" });
    expect((await runReminderTick(NOW)).sent).toBe(1);
    await snoozeReminder(a.id, t.id, at(1));
    await completeRecurringTask(a.id, t.id, DAY);
    expect((await runReminderTick(at(11))).sent).toBe(0);
    const [row] = await db.select().from(taskReminders).where(eq(taskReminders.taskId, t.id));
    expect(row.snoozedUntil).toBeNull();
    expect((await runReminderTick(at(24 * 60))).sent).toBe(1);
    expect(sendNotification).toHaveBeenCalledTimes(2);
  });

  it("is dropped when the due date moves", async () => {
    const t = await task("Dentist");
    await setTaskReminder(a.id, t.id, { kind: "at_due" });
    await runReminderTick(NOW);
    await snoozeReminder(a.id, t.id, at(1));
    await updateTask(a.id, t.id, { dueDate: "2030-06-11" });
    expect((await runReminderTick(at(11))).sent).toBe(0);
    expect((await runReminderTick(at(24 * 60))).sent).toBe(1);
  });

  it("is dropped when a plain task is ticked in the app", async () => {
    const t = await task("Plain");
    await setTaskReminder(a.id, t.id, { kind: "at_due" });
    await runReminderTick(NOW);
    await snoozeReminder(a.id, t.id, at(1));
    await setTaskDone(a.id, t.id, true);
    await runReminderTick(at(11));
    await setTaskDone(a.id, t.id, false);
    expect((await runReminderTick(at(12))).sent).toBe(0);
    expect(sendNotification).toHaveBeenCalledTimes(1);
  });

  it("waits for quiet hours to end", async () => {
    await db
      .update(userSettings)
      .set({ quietStart: "17:20", quietEnd: "18:00" })
      .where(eq(userSettings.userId, a.id));
    const t = await task("Quiet snooze");
    await setTaskReminder(a.id, t.id, { kind: "at_due" });
    expect((await runReminderTick(NOW)).sent).toBe(1);
    // Snoozed at 17:15 IST: it would ring at 17:25, inside the window, so it waits until 18:00.
    expect(await snoozeReminder(a.id, t.id, at(15))).toEqual(at(25));
    expect((await runReminderTick(at(25))).sent).toBe(0);
    expect((await runReminderTick(at(59))).sent).toBe(0);
    expect(await runReminderTick(at(60))).toMatchObject({ sent: 1, snoozed: 1 });
    expect(sentPayloads()[1].body).toContain("Held during quiet hours");
    expect((await runReminderTick(at(61))).sent).toBe(0);
  });
});

describe("stale notifications and double presses", () => {
  it("Done and Snooze refuse a round that has passed with 409", async () => {
    const t = await task("Moved", { dueDate: "2030-06-11" });
    const done = await donePost(post({ round: DAY }), params(t.id));
    expect(done.status).toBe(409);
    expect(await done.json()).toEqual({ ok: false, error: "stale" });
    expect((await snoozePost(post({ round: DAY }), params(t.id))).status).toBe(409);
    expect((await getTask(a.id, t.id))?.status).toBe("open");
    expect(await db.select().from(taskReminders)).toHaveLength(0);
  });

  it("Done accepts the current round, a null round and no body", async () => {
    const one = await task("One");
    expect((await donePost(post({ round: DAY }), params(one.id))).status).toBe(200);
    const two = await task("Two");
    expect((await donePost(post({ round: null }), params(two.id))).status).toBe(200);
    const three = await task("Three");
    expect((await donePost(post(), params(three.id))).status).toBe(200);
    expect((await getTask(a.id, three.id))?.status).toBe("done");
  });

  it("refuses a body of the wrong shape with 400", async () => {
    const t = await task("Odd body");
    expect((await donePost(post({ round: 5 }), params(t.id))).status).toBe(400);
    expect((await getTask(a.id, t.id))?.status).toBe("open");
  });

  it("two Done presses at once on a repeat finish one round", async () => {
    const t = await task("Twice", { recurrenceRule: "FREQ=DAILY", dueDate: "2020-01-01" });
    const results = await Promise.all([
      donePost(post({ round: "2020-01-01" }), params(t.id)),
      donePost(post({ round: "2020-01-01" }), params(t.id)),
    ]);
    expect(results.every((r) => r.status === 200 || r.status === 409)).toBe(true);
    const copies = await db.select().from(tasks).where(eq(tasks.recurrenceOriginId, t.id));
    expect(copies).toHaveLength(1);
    expect(await getTask(a.id, t.id)).toMatchObject({ status: "open" });
  });
});

describe("origin check", () => {
  it("refuses another site with 403, before touching the task", async () => {
    const t = await task("Cross site");
    const refused: Record<string, string>[] = [
      { "sec-fetch-site": "cross-site" },
      { "sec-fetch-site": "same-site" },
      { "sec-fetch-site": "none" },
      { "sec-fetch-site": "cross-site", origin: "http://localhost:3000" },
      { origin: "https://evil.example" },
      {},
    ];
    for (const headers of refused) {
      expect((await donePost(post(undefined, headers), params(t.id))).status).toBe(403);
      expect((await snoozePost(post(undefined, headers), params(t.id))).status).toBe(403);
    }
    expect((await getTask(a.id, t.id))?.status).toBe("open");
  });

  it("allows same-origin, and the app's own Origin when Sec-Fetch-Site is absent", async () => {
    const one = await task("Same origin");
    expect((await donePost(post(), params(one.id))).status).toBe(200);
    const two = await task("Origin header");
    const res = await donePost(
      post(undefined, { origin: "http://localhost:3000" }),
      params(two.id),
    );
    expect(res.status).toBe(200);
  });

  it("checks the origin before the session", async () => {
    const t = await task("Signed out cross site");
    testAuth.reset("");
    const res = await donePost(post(undefined, { "sec-fetch-site": "cross-site" }), params(t.id));
    expect(res.status).toBe(403);
  });
});

describe("POST /api/reminders/subscription", () => {
  const newSub = {
    endpoint: "https://fcm.googleapis.com/fcm/send/new",
    keys: { p256dh: "k2", auth: "a2" },
  };

  async function signIn(userId: string) {
    n += 1;
    const [row] = await db
      .insert(session)
      .values({ userId, token: `sub-${n}-${Date.now()}`, expiresAt: new Date("2099-01-01") })
      .returning({ id: session.id });
    testAuth.reset(userId);
    testAuth.sessionId = row.id;
    return row.id;
  }

  const subPost = (body: unknown, site = "same-origin") =>
    subscriptionPost(
      new Request("http://localhost:3000/api/reminders/subscription", {
        method: "POST",
        headers: {
          "sec-fetch-site": site,
          "user-agent": "Mozilla/5.0 (Linux; Android 14) Chrome/130.0",
        },
        body: JSON.stringify(body),
      }),
    );

  const endpointsOf = async (userId: string) =>
    (await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, userId))).map(
      (r) => r.endpoint,
    );

  it("saves the new subscription and removes this user's old one", async () => {
    const sessionId = await signIn(a.id);
    const [old] = await endpointsOf(a.id);
    const res = await subPost({ oldEndpoint: old, subscription: newSub });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(await endpointsOf(a.id)).toEqual([newSub.endpoint]);
    const [row] = await db
      .select()
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.endpoint, newSub.endpoint));
    expect(row).toMatchObject({ userId: a.id, sessionId, p256dh: "k2", auth: "a2" });
  });

  it("leaves another user's old endpoint alone", async () => {
    const [aOld] = await endpointsOf(a.id);
    await signIn(b.id);
    expect((await subPost({ oldEndpoint: aOld, subscription: newSub })).status).toBe(200);
    expect(await endpointsOf(a.id)).toEqual([aOld]);
    expect(await endpointsOf(b.id)).toEqual([newSub.endpoint]);
  });

  it("answers 400 for a bad body or push address, 403 from another site, 401 signed out", async () => {
    await signIn(a.id);
    const ip = { ...newSub, endpoint: "https://10.0.0.1/x" };
    expect((await subPost({ subscription: ip })).status).toBe(400);
    expect((await subPost({ oldEndpoint: "x" })).status).toBe(400);
    expect((await subPost({ subscription: newSub }, "cross-site")).status).toBe(403);
    testAuth.reset("");
    expect((await subPost({ subscription: newSub })).status).toBe(401);
    expect(await endpointsOf(a.id)).not.toContain(newSub.endpoint);
  });
});
