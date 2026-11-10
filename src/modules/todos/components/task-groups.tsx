import type { ViewTask } from "@/server/data/views";
import type { TaskGroup } from "../view-logic";
import { TaskRow } from "./task-row";
import type { DateContext, TagsById } from "./types";

/**
 * Renders grouped tasks for the cross-list views. Each row shows which list it belongs to.
 * `allTasks` is used to count each parent's subtasks for the "2/5" progress.
 */
export function TaskGroups({
  groups,
  allTasks,
  tagsById,
  ctx,
}: {
  groups: TaskGroup<ViewTask>[];
  allTasks: ViewTask[];
  tagsById: TagsById;
  ctx: DateContext;
}) {
  return (
    <div className="flex flex-col gap-6">
      {groups.map((group) => (
        <section key={group.key} aria-label={group.label || "Tasks"}>
          {group.label ? (
            <h2 className="mb-1 border-b pb-1 text-sm font-semibold">
              {group.label}{" "}
              <span className="font-normal text-muted-foreground">{group.tasks.length}</span>
            </h2>
          ) : null}
          <TaskList tasks={group.tasks} allTasks={allTasks} tagsById={tagsById} ctx={ctx} />
        </section>
      ))}
    </div>
  );
}

/** A plain list of rows. Used by every date-based view as well. */
export function TaskList({
  tasks,
  allTasks,
  tagsById,
  ctx,
}: {
  tasks: ViewTask[];
  allTasks: ViewTask[];
  tagsById: TagsById;
  ctx: DateContext;
}) {
  return (
    <ul>
      {tasks.map((task) => (
        <TaskRow
          key={task.id}
          task={task}
          subtasks={allTasks.filter((t) => t.parentId === task.id)}
          tagsById={tagsById}
          ctx={ctx}
          context={{
            listName: task.listName,
            listIcon: task.listIcon,
            parentTitle: task.parentTitle,
          }}
        />
      ))}
    </ul>
  );
}
