import { getListTasks } from "@/server/data/tasks";
import type { List } from "@/server/db/schema";
import { loadDateContext } from "../date-context";
import { parseViewSettings } from "../view-settings";
import { ListView } from "./list-view";
import { TaskDrawerHost } from "./task-drawer-host";

/**
 * Server component that loads everything for one list screen (its tasks and saved view
 * settings), then renders the list and the detail drawer. Every query is scoped to `userId`.
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
  const [{ ctx }, tasks] = await Promise.all([
    loadDateContext(userId),
    getListTasks(userId, list.id),
  ]);

  return (
    <>
      <ListView
        list={list}
        tasks={tasks}
        ctx={ctx}
        settings={parseViewSettings(list.viewSettings)}
      />
      <TaskDrawerHost userId={userId} taskParam={taskParam} ctx={ctx} />
    </>
  );
}
