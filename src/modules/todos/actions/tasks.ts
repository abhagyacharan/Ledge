"use server";

import { todayIn } from "@/lib/dates";
import { fail, ok } from "@/lib/result";
import { setTaskTags } from "@/server/data/tags";
import { getUserSettings } from "@/server/data/settings";
import {
  completeRecurringTask,
  createTask,
  getTask,
  moveTaskToList,
  reorderTask,
  restoreTask,
  setTaskDone,
  trashTask,
  undoRecurringCompletion,
  updateTask,
  type RecurringCompletion,
  type TaskPatch,
} from "@/server/data/tasks";

/** What ticking a task returns: the repeat details when it was a repeating task. */
type DoneResult = { recurring: RecurringCompletion | null };
import {
  createTaskSchema,
  moveTaskSchema,
  reorderTaskSchema,
  setTaskDoneSchema,
  setTaskTagsSchema,
  taskIdSchema,
  undoRecurringSchema,
  updateTaskSchema,
} from "../schema";
import { guarded, NOT_FOUND, refresh } from "./guard";

export async function createTaskAction(input: unknown) {
  return guarded(createTaskSchema, input, async ({ tagIds, ...data }, userId) => {
    const task = await createTask(userId, data);
    if (!task) return fail("Couldn't add that task. The list or parent no longer exists.");
    if (tagIds && tagIds.length > 0) await setTaskTags(userId, task.id, tagIds);
    refresh();
    return ok({ id: task.id });
  });
}

export async function updateTaskAction(input: unknown) {
  return guarded(updateTaskSchema, input, async ({ id, ...patch }, userId) => {
    const defined = Object.fromEntries(
      Object.entries(patch).filter(([, v]) => v !== undefined),
    ) as TaskPatch;
    if (defined.recurrenceRule) {
      // Say why, instead of the generic "no longer exists".
      const current = await getTask(userId, id);
      if (!current) return fail(NOT_FOUND);
      if (current.parentId) return fail("Only a task, not a subtask, can repeat.");
      if (!(defined.dueDate ?? current.dueDate))
        return fail("Set a due date before it can repeat.");
    }
    const task = await updateTask(userId, id, defined);
    if (!task) return fail(NOT_FOUND);
    refresh();
    return ok();
  });
}

export async function setTaskDoneAction(input: unknown) {
  return guarded(setTaskDoneSchema, input, async ({ id, done }, userId) => {
    if (done) {
      // A repeating task is not finished for good: a copy goes to Completed and it moves on.
      const { timezone } = await getUserSettings(userId);
      const recurring = await completeRecurringTask(userId, id, todayIn(timezone));
      if (recurring) {
        refresh();
        return ok<DoneResult>({ recurring });
      }
    }
    if (!(await setTaskDone(userId, id, done))) return fail(NOT_FOUND);
    refresh();
    return ok<DoneResult>({ recurring: null });
  });
}

/** Undo for completing a repeating task. */
export async function undoRecurringCompletionAction(input: unknown) {
  return guarded(undoRecurringSchema, input, async (data, userId) => {
    if (!(await undoRecurringCompletion(userId, data))) return fail(NOT_FOUND);
    refresh();
    return ok();
  });
}

export async function moveTaskAction(input: unknown) {
  return guarded(moveTaskSchema, input, async ({ id, listId, sectionId }, userId) => {
    const moved = await moveTaskToList(userId, id, listId, sectionId ?? null);
    if (!moved) return fail("Couldn't move that task.");
    refresh();
    return ok();
  });
}

export async function trashTaskAction(input: unknown) {
  return guarded(taskIdSchema, input, async ({ id }, userId) => {
    if (!(await trashTask(userId, id))) return fail(NOT_FOUND);
    refresh();
    return ok();
  });
}

export async function restoreTaskAction(input: unknown) {
  return guarded(taskIdSchema, input, async ({ id }, userId) => {
    if (!(await restoreTask(userId, id))) return fail(NOT_FOUND);
    refresh();
    return ok();
  });
}

export async function setTaskTagsAction(input: unknown) {
  return guarded(setTaskTagsSchema, input, async ({ id, tagIds }, userId) => {
    if (!(await setTaskTags(userId, id, tagIds))) return fail(NOT_FOUND);
    refresh();
    return ok();
  });
}

/** Drag and drop: put a task between two neighbours, optionally in another section. */
export async function reorderTaskAction(input: unknown) {
  return guarded(reorderTaskSchema, input, async ({ id, afterId, beforeId, sectionId }, userId) => {
    const move = { afterId, beforeId, ...(sectionId === undefined ? {} : { sectionId }) };
    if (!(await reorderTask(userId, id, move))) return fail("Couldn't move that task.");
    refresh();
    return ok();
  });
}
