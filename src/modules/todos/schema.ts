import { z } from "zod";
import { isIsoDate, isIsoTime, trimTime } from "@/lib/dates";

/** Zod schemas shared by the server actions and the forms (CLAUDE.md §9). */

export const id = z.uuid("Invalid id");

const trimmed = (min: number, max: number, label: string) =>
  z.string().trim().min(min, `Enter ${label}`).max(max, `Use at most ${max} characters`);

/** Optional text that turns "" into null. */
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Use at most ${max} characters`)
    .transform((v) => (v === "" ? null : v))
    .nullable();

export const color = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, "Pick a colour")
  .nullable();

export const isoDate = z.string().refine(isIsoDate, "Enter a valid date");
export const isoTime = z
  .string()
  .refine(isIsoTime, "Enter a valid time")
  .transform((v) => trimTime(v));

// Lists
export const listName = trimmed(1, 100, "a name");
export const listFields = {
  name: listName,
  icon: optionalText(16),
  color,
  description: optionalText(500),
  targetDate: isoDate.nullable(),
};
export const createListSchema = z.object({
  name: listName,
  icon: listFields.icon.optional(),
  color: color.optional(),
  description: listFields.description.optional(),
  targetDate: listFields.targetDate.optional(),
});
export const updateListSchema = z.object({
  id,
  name: listName.optional(),
  icon: listFields.icon.optional(),
  color: color.optional(),
  description: listFields.description.optional(),
  targetDate: listFields.targetDate.optional(),
});
export const listIdSchema = z.object({ id });
export const archiveListSchema = z.object({ id, archived: z.boolean() });
export const moveSchema = z.object({ id, direction: z.enum(["up", "down"]) });

// Sections
export const sectionName = trimmed(1, 100, "a name");
export const createSectionSchema = z.object({ listId: id, name: sectionName });
export const renameSectionSchema = z.object({ id, name: sectionName });

// Tags
export const tagName = trimmed(1, 50, "a name");
export const createTagSchema = z.object({ name: tagName, color: color.optional() });
export const updateTagSchema = z.object({
  id,
  name: tagName.optional(),
  color: color.optional(),
});

// Tasks
export const taskTitle = trimmed(1, 500, "a title");
export const priority = z.number().int().min(0).max(3);

export const createTaskSchema = z.object({
  listId: id,
  title: taskTitle,
  sectionId: id.nullable().optional(),
  parentId: id.nullable().optional(),
  notes: optionalText(10_000).optional(),
  priority: priority.optional(),
  dueDate: isoDate.nullable().optional(),
  dueTime: isoTime.nullable().optional(),
});

export const updateTaskSchema = z.object({
  id,
  title: taskTitle.optional(),
  notes: optionalText(10_000).optional(),
  priority: priority.optional(),
  dueDate: isoDate.nullable().optional(),
  dueTime: isoTime.nullable().optional(),
  sectionId: id.nullable().optional(),
});

export const setTaskDoneSchema = z.object({ id, done: z.boolean() });
export const moveTaskSchema = z.object({
  id,
  listId: id,
  sectionId: id.nullable().optional(),
});
export const taskIdSchema = z.object({ id });
export const setTaskTagsSchema = z.object({ id, tagIds: z.array(id).max(50) });

/** Flattens Zod issues to the first message per field, for forms. */
export function fieldErrorsFrom(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!(key in out)) out[key] = issue.message;
  }
  return out;
}
