import { addDaysIso, isOverdue, type IsoDate, type IsoTime } from "@/lib/dates";
import type { ViewSettings } from "./view-settings";

/**
 * Pure functions that turn a flat list of tasks into sorted, grouped, filtered sections for the
 * list and All views (CLAUDE.md §6.2). No database, no React: easy to test.
 */

export type ViewableTask = {
  id: string;
  title: string;
  status: "open" | "done";
  priority: number;
  dueDate: IsoDate | null;
  dueTime: IsoTime | null;
  position: string;
  createdAt: Date;
};

export type TaskGroup<T> = { key: string; label: string; tasks: T[] };

export type DateInfo = { today: IsoDate; timeNow: IsoTime };

const byString = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

/** Earlier times first; a missing time sorts after any time. */
export function compareTime(a: string | null, b: string | null): number {
  if (a === b) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return byString(a, b);
}

/** Earlier dates first; tasks without a date last. On the same day, by time. */
export function compareDue(a: ViewableTask, b: ViewableTask): number {
  if (a.dueDate !== b.dueDate) {
    if (a.dueDate === null) return 1;
    if (b.dueDate === null) return -1;
    return byString(a.dueDate, b.dueDate);
  }
  return compareTime(a.dueTime, b.dueTime);
}

export function filterTasks<T extends ViewableTask>(tasks: T[], settings: ViewSettings): T[] {
  return tasks.filter((t) => {
    if (!settings.showCompleted && t.status === "done") return false;
    if (settings.priority !== null && t.priority !== settings.priority) return false;
    if (settings.hasDue === "yes" && t.dueDate === null) return false;
    if (settings.hasDue === "no" && t.dueDate !== null) return false;
    return true;
  });
}

export function sortTasks<T extends ViewableTask>(tasks: T[], sort: ViewSettings["sort"]): T[] {
  const copy = [...tasks];
  const manual = (a: T, b: T) => byString(a.position, b.position);
  switch (sort) {
    case "manual":
      return copy.sort(manual);
    case "due":
      return copy.sort((a, b) => compareDue(a, b) || b.priority - a.priority || manual(a, b));
    case "priority":
      return copy.sort((a, b) => b.priority - a.priority || compareDue(a, b) || manual(a, b));
    case "created":
      return copy.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime() || manual(a, b));
  }
}

const PRIORITY_NAMES = ["No priority", "Low priority", "Medium priority", "High priority"];

/** Buckets for "group by due date", in display order. */
const DUE_BUCKETS = ["Overdue", "Today", "Tomorrow", "Next 7 days", "Later", "No date"] as const;

function dueBucket(t: ViewableTask, info: DateInfo): (typeof DUE_BUCKETS)[number] {
  if (t.dueDate === null) return "No date";
  if (t.status === "open" && isOverdue(t, info.today, info.timeNow)) return "Overdue";
  if (t.dueDate < info.today) return "Overdue"; // a finished task from the past
  if (t.dueDate === info.today) return "Today";
  if (t.dueDate === addDaysIso(info.today, 1)) return "Tomorrow";
  if (t.dueDate <= addDaysIso(info.today, 7)) return "Next 7 days";
  return "Later";
}

export function groupTasks<T extends ViewableTask>(
  tasks: T[],
  group: ViewSettings["group"],
  info: DateInfo,
): TaskGroup<T>[] {
  if (group === "none") return [{ key: "all", label: "", tasks }];

  if (group === "due") {
    return DUE_BUCKETS.map((label) => ({
      key: label,
      label,
      tasks: tasks.filter((t) => dueBucket(t, info) === label),
    })).filter((g) => g.tasks.length > 0);
  }

  return [3, 2, 1, 0]
    .map((p) => ({
      key: `p${p}`,
      label: PRIORITY_NAMES[p],
      tasks: tasks.filter((t) => t.priority === p),
    }))
    .filter((g) => g.tasks.length > 0);
}

/** Open tasks before finished ones, keeping the sort order inside each half. */
function openFirst<T extends ViewableTask>(tasks: T[]): T[] {
  return [...tasks.filter((t) => t.status === "open"), ...tasks.filter((t) => t.status === "done")];
}

/** Filter, then sort, then group. Finished tasks (when shown) go to the end of each group. */
export function applyView<T extends ViewableTask>(
  tasks: T[],
  settings: ViewSettings,
  info: DateInfo,
): TaskGroup<T>[] {
  const sorted = sortTasks(filterTasks(tasks, settings), settings.sort);
  return groupTasks(sorted, settings.group, info).map((g) => ({
    ...g,
    tasks: openFirst(g.tasks),
  }));
}
