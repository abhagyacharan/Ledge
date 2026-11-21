import { beforeEach, describe, expect, it, vi } from "vitest";
import { addDaysIso, todayIn } from "@/lib/dates";
import { setTaskDoneAction } from "@/modules/todos/actions/tasks";
import {
  completeRecurringTask,
  getTask,
  reopenRecurringCopy,
  setTaskDone,
} from "@/server/data/tasks";
import { testAuth } from "../helpers/action-session";
import { makeList, makeTask } from "../helpers/data";
import { createUser, resetAuthData, type TestUser } from "../helpers/fast-users";

vi.mock("@/server/session", async () => (await import("../helpers/action-session")).sessionModule);
vi.mock("next/headers", async () => (await import("../helpers/action-session")).headersModule);
vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));

/**
 * Repeating tasks as routines (O, 2026-11-22): unticking a finished copy undoes that round, and a
 * repeat cannot be ticked before its day.
 */

let a: TestUser;
let b: TestUser;
let list: Awaited<ReturnType<typeof makeList>>;

beforeEach(async () => {
  process.env.ALLOW_SIGNUP = "true";
  await resetAuthData();
  a = await createUser("a@example.com", "A");
  b = await createUser("b@example.com", "B");
  list = await makeList(a.id, "Home");
  testAuth.reset(a.id);
});

const skincare = (overrides = {}) =>
  makeTask(a.id, list.id, "Skincare", {
    dueDate: "2026-11-22",
    dueTime: "08:00",
    recurrenceRule: "FREQ=DAILY",
    ...overrides,
  });

describe("unticking the finished copy of a repeat", () => {
  it("removes the copy and puts the task back on the copy's date", async () => {
    const task = await skincare();
    const round = await completeRecurringTask(a.id, task.id, "2026-11-22");
    expect((await getTask(a.id, task.id))?.dueDate).toBe("2026-11-23");

    expect(await reopenRecurringCopy(a.id, round!.snapshotId)).toBe(true);
    expect(await getTask(a.id, round!.snapshotId)).toBeNull();
    const back = await getTask(a.id, task.id);
    expect(back).toMatchObject({ status: "open", dueDate: "2026-11-22", dueTime: "08:00:00" });
  });

  it("reopens a repeat that had finished on its last date", async () => {
    const task = await skincare({ dueDate: "2026-11-21", recurrenceUntil: "2026-11-22" });
    const round = await completeRecurringTask(a.id, task.id, "2026-11-21");
    // The last date: ticking it finishes the task for good, with no copy.
    expect(await completeRecurringTask(a.id, task.id, "2026-11-22")).toBeNull();
    await setTaskDone(a.id, task.id, true);

    expect(await reopenRecurringCopy(a.id, round!.snapshotId)).toBe(true);
    expect(await getTask(a.id, task.id)).toMatchObject({
      status: "open",
      completedAt: null,
      dueDate: "2026-11-21",
    });
  });

  it("does nothing for an ordinary finished task or another user's copy", async () => {
    const plain = await makeTask(a.id, list.id, "Call bank", {
      status: "done",
      completedAt: new Date(),
    });
    expect(await reopenRecurringCopy(a.id, plain.id)).toBe(false);

    const task = await skincare();
    const round = await completeRecurringTask(a.id, task.id, "2026-11-22");
    expect(await reopenRecurringCopy(b.id, round!.snapshotId)).toBe(false);
    expect(await getTask(a.id, round!.snapshotId)).not.toBeNull();
  });

  it("is what the untick action does, leaving no loose copy", async () => {
    const today = todayIn("Asia/Kolkata");
    const task = await skincare({ dueDate: today });
    const done = await setTaskDoneAction({ id: task.id, done: true });
    expect(done.ok).toBe(true);
    const snapshotId = done.ok ? done.data.recurring?.snapshotId : undefined;
    expect(snapshotId).toBeTruthy();

    const undone = await setTaskDoneAction({ id: snapshotId, done: false });
    expect(undone.ok).toBe(true);
    expect(await getTask(a.id, snapshotId!)).toBeNull();
    expect((await getTask(a.id, task.id))?.dueDate).toBe(today);
  });
});

describe("ticking a repeat ahead of its day", () => {
  it("is refused, and the task does not move", async () => {
    const tomorrow = addDaysIso(todayIn("Asia/Kolkata"), 1);
    const task = await skincare({ dueDate: tomorrow });
    const result = await setTaskDoneAction({ id: task.id, done: true });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("comes back tomorrow");
    expect((await getTask(a.id, task.id))?.dueDate).toBe(tomorrow);
  });

  it("still lets an ordinary task due later be ticked early", async () => {
    const later = addDaysIso(todayIn("Asia/Kolkata"), 3);
    const task = await makeTask(a.id, list.id, "Book tickets", { dueDate: later });
    const result = await setTaskDoneAction({ id: task.id, done: true });
    expect(result.ok).toBe(true);
    expect((await getTask(a.id, task.id))?.status).toBe("done");
  });
});
