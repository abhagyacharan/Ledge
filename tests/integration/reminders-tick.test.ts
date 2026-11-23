import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("web-push", async () => (await import("../helpers/web-push-mock")).webPushModule);
vi.mock("@/server/session", async () => (await import("../helpers/action-session")).sessionModule);
vi.mock("next/headers", async () => (await import("../helpers/action-session")).headersModule);
vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));

import { POST as donePost } from "@/app/api/reminders/[taskId]/done/route";
import { POST as snoozePost } from "@/app/api/reminders/[taskId]/snooze/route";
import { saveSubscription, setTaskReminder } from "@/server/data/reminders";
import { completeRecurringTask, getTask, updateTask } from "@/server/data/tasks";
import { db } from "@/server/db/client";
import { session, taskReminders, userSettings } from "@/server/db/schema";
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
    { endpoint: `https://push.example/${n}`, keys: { p256dh: "k", auth: "a" } },
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
const post = () => new Request("http://localhost:3000/api/reminders", { method: "POST" });

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
