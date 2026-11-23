import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { addDaysIso, todayIn } from "@/lib/dates";
import { clearTaskReminderAction, setTaskReminderAction } from "@/modules/todos/actions/reminders";
import { duplicateTaskAction } from "@/modules/todos/actions/tasks";
import { getTaskReminder, setTaskReminder, updateReminderSettings } from "@/server/data/reminders";
import { getTaskDetail } from "@/server/data/tasks";
import { getAllTasks } from "@/server/data/views";
import { db } from "@/server/db/client";
import { tasks } from "@/server/db/schema";
import { testAuth } from "../helpers/action-session";
import { makeList, makeTask } from "../helpers/data";
import { createUser, resetAuthData, type TestUser } from "../helpers/fast-users";

vi.mock("@/server/session", async () => (await import("../helpers/action-session")).sessionModule);
vi.mock("next/headers", async () => (await import("../helpers/action-session")).headersModule);
vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));

/**
 * Reminders on tasks (docs/reminders-spec.md §3 to §5): the actions, ownership, duplicate and the
 * bell (`hasReminder`) on view rows, with the Settings default and the "None" override.
 */

let a: TestUser;
let b: TestUser;
let listId: string;
let aTaskId: string;
const today = todayIn("Asia/Kolkata");
const tomorrow = addDaysIso(today, 1);

beforeEach(async () => {
  process.env.ALLOW_SIGNUP = "true";
  process.env.VAPID_PUBLIC_KEY = "public";
  process.env.VAPID_PRIVATE_KEY = "private";
  process.env.VAPID_SUBJECT = "mailto:test@example.com";
  await resetAuthData();
  a = await createUser("a@example.com", "A");
  b = await createUser("b@example.com", "B");
  listId = (await makeList(a.id, "Home")).id;
  aTaskId = (await makeTask(a.id, listId, "Pay rent", { dueDate: tomorrow, dueTime: "17:00" })).id;
  testAuth.reset(a.id);
});

const flag = async (userId: string, taskId: string) =>
  (await getAllTasks(userId)).find((t) => t.id === taskId)?.hasReminder;

describe("setting, changing and clearing", () => {
  it("sets, changes and clears the reminder through the actions", async () => {
    expect(
      await setTaskReminderAction({
        taskId: aTaskId,
        choice: { kind: "before", offsetMinutes: 30 },
      }),
    ).toMatchObject({ ok: true });
    expect(await getTaskReminder(a.id, aTaskId)).toMatchObject({
      kind: "before",
      offsetMinutes: 30,
    });
    expect(await flag(a.id, aTaskId)).toBe(true);

    await setTaskReminderAction({ taskId: aTaskId, choice: { kind: "at_due" } });
    expect(await getTaskReminder(a.id, aTaskId)).toMatchObject({ kind: "at_due" });

    expect(await clearTaskReminderAction({ taskId: aTaskId })).toMatchObject({ ok: true });
    expect(await getTaskReminder(a.id, aTaskId)).toBeNull();
    expect(await flag(a.id, aTaskId)).toBe(false);
  });

  it("refuses a relative reminder on a task without a date, and bad input", async () => {
    const noDate = (await makeTask(a.id, listId, "Someday")).id;
    const result = await setTaskReminderAction({ taskId: noDate, choice: { kind: "at_due" } });
    expect(result).toMatchObject({ ok: false, error: "Set a date first." });
    expect(
      await setTaskReminderAction({
        taskId: aTaskId,
        choice: { kind: "before", offsetMinutes: 7 },
      }),
    ).toMatchObject({ ok: false });
    // A custom reminder has a date of its own.
    expect(
      await setTaskReminderAction({
        taskId: noDate,
        choice: { kind: "custom", date: tomorrow, time: "08:00" },
      }),
    ).toMatchObject({ ok: true });
  });

  it("includes the reminder in the task detail's bell flag", async () => {
    await setTaskReminder(a.id, aTaskId, { kind: "at_due" });
    expect((await getTaskDetail(a.id, aTaskId))?.task.hasReminder).toBe(true);
  });
});

describe("another user", () => {
  it("cannot set or clear A's reminder, and reads nothing of it", async () => {
    await setTaskReminder(a.id, aTaskId, { kind: "at_due" });
    testAuth.reset(b.id);
    expect(
      await setTaskReminderAction({
        taskId: aTaskId,
        choice: { kind: "before", offsetMinutes: 5 },
      }),
    ).toMatchObject({ ok: false });
    expect(await clearTaskReminderAction({ taskId: aTaskId })).toMatchObject({ ok: false });
    expect(await getTaskReminder(b.id, aTaskId)).toBeNull();
    expect(await getTaskReminder(a.id, aTaskId)).toMatchObject({ kind: "at_due" });
    expect(await flag(b.id, aTaskId)).toBeUndefined();
  });
});

describe("duplicate", () => {
  it("copies the reminder, including None", async () => {
    await setTaskReminder(a.id, aTaskId, { kind: "before", offsetMinutes: 120 });
    const copy = await duplicateTaskAction({ id: aTaskId });
    if (!copy.ok) throw new Error("duplicate failed");
    expect(await getTaskReminder(a.id, copy.data.id)).toMatchObject({
      kind: "before",
      offsetMinutes: 120,
    });

    await setTaskReminder(a.id, aTaskId, { kind: "none" });
    const second = await duplicateTaskAction({ id: aTaskId });
    if (!second.ok) throw new Error("duplicate failed");
    expect(await getTaskReminder(a.id, second.data.id)).toMatchObject({ kind: "none" });
  });

  it("copies a custom reminder", async () => {
    await setTaskReminder(a.id, aTaskId, { kind: "custom", date: tomorrow, time: "08:30" });
    const copy = await duplicateTaskAction({ id: aTaskId });
    if (!copy.ok) throw new Error("duplicate failed");
    expect(await getTaskReminder(a.id, copy.data.id)).toMatchObject({
      kind: "custom",
      customDate: tomorrow,
    });
  });
});

describe("the bell on view rows", () => {
  async function setDefault(value: string) {
    await updateReminderSettings(a.id, {
      reminderDefault: value,
      reminderMorningTime: "09:00",
      quietStart: null,
      quietEnd: null,
    });
    // Tasks made before the default changed do not get it; backdate the existing one.
    await db
      .update(tasks)
      .set({ createdAt: new Date(Date.now() - 86_400_000) })
      .where(eq(tasks.id, aTaskId));
  }

  it("shows for the default on a new task with a time, not for older or date-only ones", async () => {
    await setDefault("before:15");
    const fresh = (await makeTask(a.id, listId, "Fresh", { dueDate: tomorrow, dueTime: "09:00" }))
      .id;
    const dateOnly = (await makeTask(a.id, listId, "Date only", { dueDate: tomorrow })).id;
    expect(await flag(a.id, fresh)).toBe(true);
    expect(await flag(a.id, dateOnly)).toBe(false);
    expect(await flag(a.id, aTaskId)).toBe(false);
  });

  it("is switched off for a task by a None row", async () => {
    await setDefault("at_due");
    const fresh = (await makeTask(a.id, listId, "Fresh", { dueDate: tomorrow, dueTime: "09:00" }))
      .id;
    expect(await flag(a.id, fresh)).toBe(true);
    await setTaskReminderAction({ taskId: fresh, choice: { kind: "none" } });
    expect(await flag(a.id, fresh)).toBe(false);
  });

  it("is false for a past date and when push is not set up", async () => {
    const past = (await makeTask(a.id, listId, "Past", { dueDate: addDaysIso(today, -2) })).id;
    await setTaskReminder(a.id, past, {
      kind: "custom",
      date: addDaysIso(today, -1),
      time: "08:00",
    });
    expect(await flag(a.id, past)).toBe(false);

    await setTaskReminder(a.id, aTaskId, { kind: "at_due" });
    expect(await flag(a.id, aTaskId)).toBe(true);
    delete process.env.VAPID_PUBLIC_KEY;
    expect(await flag(a.id, aTaskId)).toBe(false);
  });
});
