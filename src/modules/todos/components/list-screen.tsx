import { getListTasks } from "@/server/data/tasks";
import { listSections } from "@/server/data/sections";
import { listTags } from "@/server/data/tags";
import type { List } from "@/server/db/schema";
import { loadDateContext } from "../date-context";
import { parseViewSettings } from "../view-settings";
import { ListView } from "./list-view";
import { TaskDrawerHost } from "./task-drawer-host";
import type { TagsById } from "./types";

/**
 * Server component that loads everything for one list screen (its sections, tasks, tags and saved
 * view settings), then renders the list and the detail drawer. Every query is scoped to `userId`.
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
  const [{ ctx }, sections, tasks, tags] = await Promise.all([
    loadDateContext(userId),
    listSections(userId, list.id),
    getListTasks(userId, list.id),
    listTags(userId),
  ]);
  const tagsById: TagsById = Object.fromEntries(tags.map((t) => [t.id, t]));

  return (
    <>
      <ListView
        list={list}
        sections={sections}
        tasks={tasks}
        tags={tags}
        tagsById={tagsById}
        ctx={ctx}
        settings={parseViewSettings(list.viewSettings)}
      />
      <TaskDrawerHost userId={userId} taskParam={taskParam} ctx={ctx} />
    </>
  );
}
