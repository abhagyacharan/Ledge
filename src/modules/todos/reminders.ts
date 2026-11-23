import { formatRowDay, formatTime } from "@/lib/dates";
import { parseReminderDefault, type ReminderChoice } from "@/modules/reminders/schema";

/**
 * Pure helpers for a task's reminder in the task screens (docs/reminders-spec.md §3, §5): the
 * words for each choice, whether the Settings default applies to a task, and whether a row gets
 * its bell. Shared by the server (bell on rows) and the drawer and quick add (the field).
 */

/** What a stored reminder row holds (a `task_reminders` row, or the parts of it we read). */
export type ReminderRowLike = {
  kind: "none" | "at_due" | "before" | "custom";
  offsetMinutes: number | null;
  customDate: string | null;
  customTime: string | null;
};

/** The "before" choices in the order they are listed. */
export const BEFORE_CHOICES = [5, 10, 15, 30, 60, 120, 1440] as const;

const BEFORE_LABELS: Record<number, string> = {
  5: "5 minutes before",
  10: "10 minutes before",
  15: "15 minutes before",
  30: "30 minutes before",
  60: "1 hour before",
  120: "2 hours before",
  1440: "1 day before",
};

/** A stored row as a choice; custom times lose their seconds. */
export function rowToChoice(row: ReminderRowLike): ReminderChoice {
  if (row.kind === "before" && row.offsetMinutes !== null) {
    return { kind: "before", offsetMinutes: row.offsetMinutes };
  }
  if (row.kind === "custom" && row.customDate && row.customTime) {
    return { kind: "custom", date: row.customDate, time: row.customTime.slice(0, 5) };
  }
  if (row.kind === "at_due") return { kind: "at_due" };
  return { kind: "none" };
}

/** "At due time", or "At 9:00 am" for a task with a date but no time (the morning time). */
export function atDueLabel(hasTime: boolean, morningTime: string, locale: string): string {
  return hasTime ? "At due time" : `At ${formatTime(morningTime, locale)}`;
}

export function beforeLabel(minutes: number): string {
  return BEFORE_LABELS[minutes] ?? `${minutes} minutes before`;
}

export function choiceLabel(
  choice: ReminderChoice,
  o: { hasTime: boolean; morningTime: string; today: string; locale: string },
): string {
  switch (choice.kind) {
    case "none":
      return "None";
    case "at_due":
      return atDueLabel(o.hasTime, o.morningTime, o.locale);
    case "before":
      return beforeLabel(choice.offsetMinutes);
    case "custom":
      return `${formatRowDay(choice.date, o.today, o.locale)}, ${formatTime(choice.time, o.locale)}`;
  }
}

export type DefaultSettings = {
  reminderDefault: string;
  reminderDefaultSince: Date | null;
};

/**
 * The Settings default as it applies to one task (§5): only a task with a due time that was
 * created after the default was last changed. Null when it does not apply or the default is None.
 */
export function defaultChoiceFor(
  task: { dueTime: string | null; createdAt: Date },
  settings: DefaultSettings,
): ReminderChoice | null {
  if (!task.dueTime || !settings.reminderDefaultSince) return null;
  if (task.createdAt.getTime() <= settings.reminderDefaultSince.getTime()) return null;
  const choice = parseReminderDefault(settings.reminderDefault);
  return choice.kind === "none" ? null : choice;
}

/**
 * Whether a task's row gets the bell: an open task with a reminder (its own, or the default when
 * it has no row) whose date, or custom date, is today or later.
 */
export function hasActiveReminder(
  task: { status: string; dueDate: string | null; dueTime: string | null; createdAt: Date },
  row: ReminderRowLike | null,
  settings: DefaultSettings,
  today: string,
): boolean {
  if (task.status !== "open") return false;
  const choice = row ? rowToChoice(row) : defaultChoiceFor(task, settings);
  if (!choice || choice.kind === "none") return false;
  const date = choice.kind === "custom" ? choice.date : task.dueDate;
  return date !== null && date >= today;
}
