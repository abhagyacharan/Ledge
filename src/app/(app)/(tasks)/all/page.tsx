import { ListTodo } from "lucide-react";
import type { Metadata } from "next";
import { EmptyState } from "@/components/shell/empty-state";
import { InlineAdd } from "@/modules/todos/components/inline-add";
import { QuickAddButton } from "@/modules/todos/components/quick-add-button";
import { TaskDrawerHost } from "@/modules/todos/components/task-drawer-host";
import { AllTasksTable } from "@/modules/todos/components/all-tasks-table";
import { TaskGroups } from "@/modules/todos/components/task-groups";
import { PageTitle } from "@/components/dash/page-title";
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

  const open = topLevel.filter((t) => t.status === "open");
  const listCount = new Set(open.map((t) => t.listId)).size;
  const doneCount = topLevel.length - open.length;
  const empty =
    groups.length === 0 ? (
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
    ) : null;

  return (
    <>
      <PageTitle
        back={{ href: "/tasks", label: "Tasks" }}
        title="All tasks"
        meta={`${open.length} open across ${listCount} ${listCount === 1 ? "list" : "lists"} · ${doneCount} completed`}
      />
      <div className="mb-3">
        <UrlViewControls settings={settings} base={BASE} />
      </div>

      {/* Phones and tablets: rows, grouped as the view says. */}
      <TaskPanel
        id="all"
        title="All tasks"
        hideTitle
        className="px-4 py-3 md:px-5 md:py-4 lg:hidden"
      >
        {empty ?? <TaskGroups groups={groups} allTasks={tasks} ctx={ctx} />}
        <InlineAdd listId={inbox.id} label={`Add a task to ${inbox.name}`} />
      </TaskPanel>

      {/* With a mouse: one table (screen 6d), in the view's order. */}
      <div className="hidden flex-col gap-3 lg:flex">
        {empty ? (
          <div className="rounded-2xl border border-dash-edge bg-dash-card">{empty}</div>
        ) : (
          <AllTasksTable tasks={groups.flatMap((g) => g.tasks)} allTasks={tasks} ctx={ctx} />
        )}
        <div className="rounded-2xl border border-dash-edge bg-dash-card px-4 shadow-(--dash-card-shadow)">
          <InlineAdd listId={inbox.id} label={`Add a task to ${inbox.name}`} />
        </div>
      </div>
      <TaskDrawerHost
        userId={userId}
        taskParam={typeof params.task === "string" ? params.task : undefined}
        ctx={ctx}
      />
    </>
  );
}
