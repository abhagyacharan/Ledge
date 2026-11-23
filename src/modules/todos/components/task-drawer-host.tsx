import { listLists } from "@/server/data/lists";
import { getTaskPlanChip } from "@/server/data/plans";
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
  const [lists, raw] = await Promise.all([
    listLists(userId),
    taskId.success ? getTaskDetail(userId, taskId.data) : Promise.resolve(null),
  ]);

  let detail: TaskDetailData | null = null;
  if (raw) {
    const { task, subtasks } = raw;
    const parent = task.parentId ? await getTask(userId, task.parentId) : null;
    // A task from a plan names it (and its phase) in a chip that links back to the plan.
    const plan = await getTaskPlanChip(userId, task);
    detail = { task, subtasks, parentTitle: parent?.title ?? null, plan };
  }

  return <TaskDrawer detail={detail} lists={lists} ctx={ctx} />;
}
