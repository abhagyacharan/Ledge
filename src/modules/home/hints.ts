import { daysBetween, isoWeekday } from "@/lib/dates";

// Plans' row on Home (docs/plans designs 8n) is worded in the planner module, beside its tests.
export { plansHint, type PlansHint } from "@/modules/planner/plan-view";

/**
 * The words on Home (docs/new_design.md §1, screens 1a and 1e): a greeting for the time of day, one
 * sentence about today's tasks, and one short live hint per module. Pure, so it is unit tested.
 */

export type TaskCounts = {
  /** Open tasks due today. */
  dueToday: number;
  /** Open tasks due before today. */
  overdue: number;
  /** Tasks ticked off today. */
  doneToday: number;
  /** The due date of the oldest overdue task, when there is exactly one. */
  overdueDate: string | null;
};

const WORDS = ["No", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];
const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

/** "Two", "Twelve" stays "12": words read better for small counts at the start of a sentence. */
function countWord(n: number): string {
  return n < WORDS.length ? (WORDS[n] ?? String(n)) : String(n);
}

/** "Good morning" until noon, "Good afternoon" until 5 pm, then "Good evening". */
export function greeting(time: string, firstName: string): string {
  const hour = Number(time.slice(0, 2));
  const part = hour < 5 ? "evening" : hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";
  return firstName ? `Good ${part}, ${firstName}` : `Good ${part}`;
}

/** The sentence under the greeting: today first, then anything older that is still open. */
export function tasksSentence(counts: TaskCounts, today: string): string {
  const { dueToday, overdue, doneToday, overdueDate } = counts;
  const first =
    dueToday > 0
      ? `${countWord(dueToday)} ${dueToday === 1 ? "task" : "tasks"} left today.`
      : doneToday > 0
        ? "Today is done."
        : overdue > 0
          ? "Nothing due today."
          : "All caught up.";
  if (overdue === 0) return first;
  if (overdue === 1) {
    const age = overdueDate ? daysBetween(overdueDate, today) : null;
    const from =
      age === 1
        ? "One from yesterday"
        : age !== null && age > 1 && age < 7 && overdueDate
          ? `One from ${WEEKDAYS[isoWeekday(overdueDate) - 1]}`
          : "One older task";
    return `${first} ${from} is still open.`;
  }
  return `${first} ${countWord(overdue)} older tasks are still open.`;
}

/** The Tasks row's hint ("2 due today"), without the overdue part, which is shown on its own. */
export function tasksHint(counts: TaskCounts): string {
  if (counts.dueToday > 0) return `${counts.dueToday} due today`;
  return counts.doneToday > 0 ? "All done today" : "Nothing due today";
}
