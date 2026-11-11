import { ListTodo } from "lucide-react";
import type { Metadata } from "next";
import { EmptyState } from "@/components/shell/empty-state";
import { InlineAdd } from "@/modules/todos/components/inline-add";
import { QuickAddButton } from "@/modules/todos/components/quick-add-button";
import { TaskDrawerHost } from "@/modules/todos/components/task-drawer-host";
import { TaskGroups } from "@/modules/todos/components/task-groups";
import { TaskPanel } from "@/modules/todos/components/task-panel";
import { UrlViewControls } from "@/modules/todos/components/url-view-controls";
import { loadDateContext } from "@/modules/todos/date-context";
import { applyView } from "@/modules/todos/view-logic";
import {
  DEFAULT_VIEW_SETTINGS,
  settingsFromSearchParams,
  type ViewSettings,
} from "@/modules/todos/view-settings";
import { getInbox } from "@/server/data/lists";
import { getAllTasks } from "@/server/data/views";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "All tasks" };

/** The All view starts sorted by due date. Choices live in the URL. */
const BASE: ViewSettings = { ...DEFAULT_VIEW_SETTINGS, sort: "due" };

export default async function AllTasksPage({ searchParams }: PageProps<"/all">) {
  const { userId } = await requireUser();
  const params = await searchParams;
  const [{ ctx }, inbox, tasks] = await Promise.all([
    loadDateContext(userId),
    getInbox(userId),
    getAllTasks(userId),
  ]);
  const settings = settingsFromSearchParams(params, BASE);
  const topLevel = tasks.filter((t) => !t.parentId);
  const groups = applyView(topLevel, settings, ctx);

  return (
    <>
      <TaskPanel
        id="all"
        title="All tasks"
        subtitle="Every task in every list."
        action={<UrlViewControls settings={settings} base={BASE} />}
      >
        {groups.length === 0 ? (
          <EmptyState
            icon={ListTodo}
            title={topLevel.length === 0 ? "No tasks yet" : "No tasks match this view"}
            hint={
              topLevel.length === 0
                ? "Add your first task and it will show up here."
                : "Change or reset the view to see more."
            }
            action={topLevel.length === 0 ? <QuickAddButton /> : undefined}
          />
        ) : (
          <TaskGroups groups={groups} allTasks={tasks} ctx={ctx} />
        )}
        <InlineAdd listId={inbox.id} label={`Add a task to ${inbox.name}`} />
      </TaskPanel>
      <TaskDrawerHost
        userId={userId}
        taskParam={typeof params.task === "string" ? params.task : undefined}
        ctx={ctx}
      />
    </>
  );
}
