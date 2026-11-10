import { timeNowIn, todayIn } from "@/lib/dates";
import { getListTasks, getTaskDetail } from "@/server/data/tasks";
import { listLists } from "@/server/data/lists";
import { listSections } from "@/server/data/sections";
import { getUserSettings } from "@/server/data/settings";
import { listTags } from "@/server/data/tags";
import type { List } from "@/server/db/schema";
import { id as uuid } from "../schema";
import { ListView } from "./list-view";
import { TaskDrawer, type TaskDetailData } from "./task-drawer";
import type { DateContext, TagsById } from "./types";

/**
 * Server component that loads everything for one list screen (its sections, tasks, tags) plus the
 * task named by `?task=<id>`, then renders the list and the detail drawer. Every query is scoped
 * to `userId`; a task id from the URL that is not the user's simply opens nothing.
 */
export async function ListScreen({
  userId,
  list,
  taskParam,
}: {
  userId: string;
  list: List;
  taskParam: string | undefined;
}) {
  const settings = await getUserSettings(userId);
  const now = new Date();
  const ctx: DateContext = {
    today: todayIn(settings.timezone, now),
    timeNow: timeNowIn(settings.timezone, now),
    locale: settings.locale,
    weekStartsOn: settings.weekStartsOn,
  };

  const taskId = uuid.safeParse(taskParam);
  const [sections, tasks, tags, lists, rawDetail] = await Promise.all([
    listSections(userId, list.id),
    getListTasks(userId, list.id),
    listTags(userId),
    listLists(userId),
    taskId.success ? getTaskDetail(userId, taskId.data) : Promise.resolve(null),
  ]);

  const tagsById: TagsById = Object.fromEntries(tags.map((t) => [t.id, t]));

  let detail: TaskDetailData | null = null;
  if (rawDetail) {
    const { task, subtasks } = rawDetail;
    detail = {
      task,
      subtasks,
      parentTitle: tasks.find((t) => t.id === task.parentId)?.title ?? null,
      sections: task.listId === list.id ? sections : await listSections(userId, task.listId),
    };
  }

  return (
    <>
      <ListView list={list} sections={sections} tasks={tasks} tagsById={tagsById} ctx={ctx} />
      <TaskDrawer detail={detail} lists={lists} tags={tags} ctx={ctx} />
    </>
  );
}
