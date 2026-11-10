import { listLists } from "@/server/data/lists";
import { listSections } from "@/server/data/sections";
import { listTags } from "@/server/data/tags";
import { getTask, getTaskDetail } from "@/server/data/tasks";
import { id as uuid } from "../schema";
import { TaskDrawer, type TaskDetailData } from "./task-drawer";
import type { DateContext } from "./types";

/**
 * Loads the task named by `?task=<id>` (scoped to `userId`; an id that is not the user's opens
 * nothing) and renders the detail drawer. Every screen that lists tasks includes this.
 */
export async function TaskDrawerHost({
  userId,
  taskParam,
  ctx,
}: {
  userId: string;
  taskParam: string | undefined;
  ctx: DateContext;
}) {
  const taskId = uuid.safeParse(taskParam);
  const [lists, tags, raw] = await Promise.all([
    listLists(userId),
    listTags(userId),
    taskId.success ? getTaskDetail(userId, taskId.data) : Promise.resolve(null),
  ]);

  let detail: TaskDetailData | null = null;
  if (raw) {
    const { task, subtasks } = raw;
    const [sections, parent] = await Promise.all([
      listSections(userId, task.listId),
      task.parentId ? getTask(userId, task.parentId) : Promise.resolve(null),
    ]);
    detail = { task, subtasks, parentTitle: parent?.title ?? null, sections };
  }

  return <TaskDrawer detail={detail} lists={lists} tags={tags} ctx={ctx} />;
}
