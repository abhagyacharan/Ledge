import { AnimatePresence } from "motion/react";
import type { ViewTask } from "@/server/data/views";
import type { TaskGroup as Group } from "../view-logic";
import { TaskGroup } from "./task-panel";
import { TaskRow } from "./task-row";
import type { DateContext } from "./types";

/**
 * Grouped tasks for the views that mix lists. Each row shows which list it belongs to.
 * `allTasks` is used to count each parent's subtasks for the "2/5" progress.
 */
export function TaskGroups({
  groups,
  allTasks,
  ctx,
  idPrefix = "group",
}: {
  groups: Group<ViewTask>[];
  allTasks: ViewTask[];
  ctx: DateContext;
  idPrefix?: string;
}) {
  return (
    <div>
      {groups.map((group) =>
        group.label ? (
          <TaskGroup
            key={group.key}
            id={`${idPrefix}-${group.key.replace(/\s+/g, "-").toLowerCase()}`}
            label={group.label}
            count={group.tasks.length}
            tone={group.key === "Overdue" ? "bad" : undefined}
          >
            <TaskList tasks={group.tasks} allTasks={allTasks} ctx={ctx} />
          </TaskGroup>
        ) : (
          <TaskList key={group.key} tasks={group.tasks} allTasks={allTasks} ctx={ctx} />
        ),
      )}
    </div>
  );
}

/** A plain list of rows. Used by every date-based view as well. */
export function TaskList({
  tasks,
  allTasks,
  ctx,
  showList = true,
  timeOnly = false,
}: {
  tasks: ViewTask[];
  allTasks: ViewTask[];
  ctx: DateContext;
  /** Show which list each task is in (off inside a single list). */
  showList?: boolean;
  /** Grouped by day already (Upcoming): rows show only the time. */
  timeOnly?: boolean;
}) {
  return (
    <ul>
      {/* A row that leaves (ticked, deleted, moved) stays until its exit has played. */}
      <AnimatePresence initial={false}>
        {tasks.map((task) => (
          <TaskRow
            // A repeat's finished copy keeps its task's key: ticking a repeat in Today swaps the
            // row in place instead of folding it away and bringing a struck-through copy back.
            key={task.recurrenceOriginId ?? task.id}
            task={task}
            subtasks={allTasks.filter((t) => t.parentId === task.id)}
            ctx={ctx}
            timeOnly={timeOnly}
            context={
              showList
                ? {
                    listName: task.listName,
                    listIcon: task.listIcon,
                    parentTitle: task.parentTitle,
                  }
                : undefined
            }
          />
        ))}
      </AnimatePresence>
    </ul>
  );
}
