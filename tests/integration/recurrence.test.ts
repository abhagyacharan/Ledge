import { and, eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { createTag, setTaskTags, tagIdsForTasks } from "@/server/data/tags";
import {
  completeRecurringTask,
  getTask,
  setTaskDone,
  undoRecurringCompletion,
  updateTask,
} from "@/server/data/tasks";
import { getCompletedTasks } from "@/server/data/views";
import { db } from "@/server/db/client";
import { tasks } from "@/server/db/schema";
import { makeList, makeTask } from "../helpers/data";
import { createUser, resetAuthData, type TestUser } from "../helpers/fast-users";

let a: TestUser;
let b: TestUser;
let list: Awaited<ReturnType<typeof makeList>>;

beforeEach(async () => {
  process.env.ALLOW_SIGNUP = "true";
  await resetAuthData();
  a = await createUser("a@example.com", "A");
  b = await createUser("b@example.com", "B");
  list = await makeList(a.id, "Home");
});

const repeating = (overrides = {}) =>
  makeTask(a.id, list.id, "Water plants", {
    dueDate: "2026-11-10",
    dueTime: "09:00",
    recurrenceRule: "FREQ=DAILY",
    ...overrides,
  });

describe("completing a repeating task (CLAUDE.md §6.2)", () => {
  it("adds a finished copy to Completed and moves the task to the next date", async () => {
    const task = await repeating();
    const result = await completeRecurringTask(a.id, task.id, "2026-11-10");
    expect(result).not.toBeNull();
    expect(result?.nextDueDate).toBe("2026-11-11");
    expect(result?.previousDueDate).toBe("2026-11-10");

    const original = await getTask(a.id, task.id);
    expect(original?.status).toBe("open");
    expect(original?.completedAt).toBeNull();
    expect(original?.dueDate).toBe("2026-11-11");
    expect(original?.dueTime).toBe("09:00:00"); // the time of day stays
    expect(original?.recurrenceRule).toBe("FREQ=DAILY");

    const snapshot = await getTask(a.id, result!.snapshotId);
    expect(snapshot).toMatchObject({
      title: "Water plants",
      status: "done",
      dueDate: "2026-11-10",
      recurrenceOriginId: task.id,
      recurrenceRule: null, // the copy is history, it does not repeat
    });
    expect(snapshot?.completedAt).not.toBeNull();

    const completed = await getCompletedTasks(a.id);
    expect(completed.map((t) => t.id)).toEqual([result!.snapshotId]);
  });

  it("keeps repeating: completing again makes a second copy and moves on again", async () => {
    const task = await repeating();
    await completeRecurringTask(a.id, task.id, "2026-11-10");
    await completeRecurringTask(a.id, task.id, "2026-11-11");
    expect((await getTask(a.id, task.id))?.dueDate).toBe("2026-11-12");
    const copies = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.userId, a.id), eq(tasks.recurrenceOriginId, task.id)));
    expect(copies).toHaveLength(2);
  });

  it("counts from the day it was done in after-completion mode", async () => {
    const task = await repeating({
      recurrenceRule: "FREQ=WEEKLY",
      recurrenceMode: "after_completion",
      dueDate: "2026-10-01",
    });
    const result = await completeRecurringTask(a.id, task.id, "2026-11-10");
    expect(result?.nextDueDate).toBe("2026-11-17");
  });

  it("gives the copy the same tags", async () => {
    const task = await repeating();
    const tag = (await createTag(a.id, "home")).tag;
    await setTaskTags(a.id, task.id, [tag.id]);
    const result = await completeRecurringTask(a.id, task.id, "2026-11-10");
    const tagMap = await tagIdsForTasks(a.id, [task.id, result!.snapshotId]);
    expect(tagMap.get(result!.snapshotId)).toEqual([tag.id]);
    expect(tagMap.get(task.id)).toEqual([tag.id]);
  });

  it("reopens the done subtasks for the next round", async () => {
    const task = await repeating();
    const sub = await makeTask(a.id, list.id, "Fill the can", { parentId: task.id });
    await setTaskDone(a.id, sub.id, true);
    const result = await completeRecurringTask(a.id, task.id, "2026-11-10");
    expect(result?.reopenedSubtaskIds).toEqual([sub.id]);
    expect((await getTask(a.id, sub.id))?.status).toBe("open");
  });

  it("is not for ordinary tasks, finished tasks or subtasks", async () => {
    const plain = await makeTask(a.id, list.id, "Plain", { dueDate: "2026-11-10" });
    expect(await completeRecurringTask(a.id, plain.id, "2026-11-10")).toBeNull();
    const task = await repeating();
    await setTaskDone(a.id, task.id, true);
    expect(await completeRecurringTask(a.id, task.id, "2026-11-10")).toBeNull();
  });

  it("is not for a rule it does not understand", async () => {
    const task = await repeating({ recurrenceRule: "FREQ=HOURLY" });
    expect(await completeRecurringTask(a.id, task.id, "2026-11-10")).toBeNull();
  });

  it("another user cannot complete it", async () => {
    const task = await repeating();
    expect(await completeRecurringTask(b.id, task.id, "2026-11-10")).toBeNull();
    expect((await getTask(a.id, task.id))?.dueDate).toBe("2026-11-10");
  });
});

describe("undo", () => {
  it("removes the copy, restores the date and puts the subtasks back", async () => {
    const task = await repeating();
    const sub = await makeTask(a.id, list.id, "Fill the can", { parentId: task.id });
    await setTaskDone(a.id, sub.id, true);
    const done = (await completeRecurringTask(a.id, task.id, "2026-11-10"))!;

    expect(
      await undoRecurringCompletion(a.id, {
        taskId: task.id,
        snapshotId: done.snapshotId,
        previousDueDate: done.previousDueDate,
        previousDueTime: done.previousDueTime,
        reopenedSubtaskIds: done.reopenedSubtaskIds,
      }),
    ).toBe(true);

    expect(await getTask(a.id, done.snapshotId)).toBeNull();
    const original = await getTask(a.id, task.id);
    expect(original?.dueDate).toBe("2026-11-10");
    expect(original?.dueTime).toBe("09:00:00");
    expect((await getTask(a.id, sub.id))?.status).toBe("done");
    expect(await getCompletedTasks(a.id)).toHaveLength(1); // only the subtask
  });

  it("only works on the user's own copy of that task", async () => {
    const task = await repeating();
    const done = (await completeRecurringTask(a.id, task.id, "2026-11-10"))!;
    const input = {
      taskId: task.id,
      snapshotId: done.snapshotId,
      previousDueDate: "2026-01-01",
      previousDueTime: null,
      reopenedSubtaskIds: [],
    };
    expect(await undoRecurringCompletion(b.id, input)).toBe(false); // someone else's
    expect(await undoRecurringCompletion(a.id, { ...input, taskId: done.snapshotId })).toBe(false); // not its origin
    expect(await getTask(a.id, done.snapshotId)).not.toBeNull();
    expect((await getTask(a.id, task.id))?.dueDate).toBe("2026-11-11");
  });
});

describe("setting a repeat on a task", () => {
  it("needs a due date, a task that is not a subtask, and a rule that parses", async () => {
    const plain = await makeTask(a.id, list.id, "No date");
    expect(await updateTask(a.id, plain.id, { recurrenceRule: "FREQ=DAILY" })).toBeNull();
    // ...but sending the date in the same change is fine.
    const ok = await updateTask(a.id, plain.id, {
      dueDate: "2026-11-10",
      recurrenceRule: "FREQ=WEEKLY;BYDAY=TU",
    });
    expect(ok?.recurrenceRule).toBe("FREQ=WEEKLY;BYDAY=TU");

    expect(await updateTask(a.id, plain.id, { recurrenceRule: "every now and then" })).toBeNull();

    const sub = await makeTask(a.id, list.id, "Sub", { parentId: plain.id, dueDate: "2026-11-10" });
    expect(await updateTask(a.id, sub.id, { recurrenceRule: "FREQ=DAILY" })).toBeNull();
  });

  it("clearing the due date stops the repeat; clearing the rule keeps the date", async () => {
    const task = await repeating();
    expect((await updateTask(a.id, task.id, { dueDate: null }))?.recurrenceRule).toBeNull();
    const again = await repeating();
    const stopped = await updateTask(a.id, again.id, { recurrenceRule: null });
    expect(stopped?.recurrenceRule).toBeNull();
    expect(stopped?.dueDate).toBe("2026-11-10");
  });

  it("another user cannot change the repeat", async () => {
    const task = await repeating();
    expect(await updateTask(b.id, task.id, { recurrenceRule: null })).toBeNull();
    expect((await getTask(a.id, task.id))?.recurrenceRule).toBe("FREQ=DAILY");
  });

  it("can switch the mode", async () => {
    const task = await repeating();
    const changed = await updateTask(a.id, task.id, { recurrenceMode: "after_completion" });
    expect(changed?.recurrenceMode).toBe("after_completion");
  });
});
