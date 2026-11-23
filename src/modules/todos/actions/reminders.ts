"use server";

import { z } from "zod";
import { fail, ok } from "@/lib/result";
import { reminderChoiceSchema } from "@/modules/reminders/schema";
import { clearTaskReminder, setTaskReminder } from "@/server/data/reminders";
import { getTask } from "@/server/data/tasks";
import { getPushConfig } from "@/server/env";
import { id } from "../schema";
import { guarded, NOT_FOUND, refresh } from "./guard";

const setReminderSchema = z.object({ taskId: id, choice: reminderChoiceSchema });
const clearReminderSchema = z.object({ taskId: id });

const NOT_SET_UP = "Reminders are not set up on this server.";

/** Sets or changes a task's reminder (docs/reminders-spec.md §3). "None" keeps a row on purpose: it switches the Settings default off for this task. */
export async function setTaskReminderAction(input: unknown) {
  return guarded(setReminderSchema, input, async ({ taskId, choice }, userId) => {
    if (!getPushConfig()) return fail(NOT_SET_UP);
    const task = await getTask(userId, taskId);
    if (!task) return fail(NOT_FOUND);
    if ((choice.kind === "at_due" || choice.kind === "before") && !task.dueDate) {
      return fail("Set a date first.");
    }
    const row = await setTaskReminder(userId, taskId, choice);
    if (!row) return fail(NOT_FOUND);
    refresh();
    return ok();
  });
}

/** Removes a task's reminder row, so the task goes back to the Settings default (or none). */
export async function clearTaskReminderAction(input: unknown) {
  return guarded(clearReminderSchema, input, async ({ taskId }, userId) => {
    if (!(await getTask(userId, taskId))) return fail(NOT_FOUND);
    await clearTaskReminder(userId, taskId);
    refresh();
    return ok();
  });
}
