"use server";

import { fail, ok } from "@/lib/result";
import { setTaskTags } from "@/server/data/tags";
import {
  createTask,
  moveTaskToList,
  reorderTask,
  restoreTask,
  setTaskDone,
  trashTask,
  updateTask,
  type TaskPatch,
} from "@/server/data/tasks";
import {
  createTaskSchema,
  moveTaskSchema,
  reorderTaskSchema,
  setTaskDoneSchema,
  setTaskTagsSchema,
  taskIdSchema,
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
    const task = await updateTask(userId, id, defined);
    if (!task) return fail(NOT_FOUND);
    refresh();
    return ok();
  });
}

export async function setTaskDoneAction(input: unknown) {
  return guarded(setTaskDoneSchema, input, async ({ id, done }, userId) => {
    if (!(await setTaskDone(userId, id, done))) return fail(NOT_FOUND);
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
