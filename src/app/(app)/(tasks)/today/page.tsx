import { Sun } from "lucide-react";
import type { Metadata } from "next";
import { EmptyState } from "@/components/shell/empty-state";
import { formatLongDate } from "@/lib/dates";
import { InlineAdd } from "@/modules/todos/components/inline-add";
import { QuickAddButton } from "@/modules/todos/components/quick-add-button";
import { TaskDrawerHost } from "@/modules/todos/components/task-drawer-host";
import { TaskList } from "@/modules/todos/components/task-groups";
import { TaskGroup, TaskPanel } from "@/modules/todos/components/task-panel";
import { loadDateContext } from "@/modules/todos/date-context";
import { splitToday } from "@/modules/todos/day-views";
import { getInbox } from "@/server/data/lists";
import { getDueByTasks } from "@/server/data/views";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Today" };

/** Overdue first, then today, by time and then priority (CLAUDE.md §6.2). */
export default async function TodayPage({ searchParams }: PageProps<"/today">) {
  const { userId } = await requireUser();
  const [{ ctx }, { task }, inbox] = await Promise.all([
    loadDateContext(userId),
    searchParams,
    getInbox(userId),
  ]);
  const tasks = await getDueByTasks(userId, ctx.today);
  const { overdue, today } = splitToday(tasks, ctx);
  const empty = overdue.length === 0 && today.length === 0;

  return (
    <>
      <TaskPanel id="today" title="Today" subtitle={formatLongDate(ctx.today, ctx.locale)}>
        {empty ? (
          <EmptyState
            icon={Sun}
            title="Nothing due today"
            hint="Tasks due today, and anything overdue, show up here."
            action={<QuickAddButton />}
          />
        ) : null}
        {overdue.length > 0 ? (
          <TaskGroup id="overdue-heading" label="Overdue" count={overdue.length} tone="bad">
            <TaskList tasks={overdue} allTasks={[]} ctx={ctx} />
          </TaskGroup>
        ) : null}
        {today.length > 0 ? (
          <TaskGroup id="today-heading" label="Today" count={today.length}>
            <TaskList tasks={today} allTasks={[]} ctx={ctx} />
          </TaskGroup>
        ) : null}
        <InlineAdd listId={inbox.id} dueDate={ctx.today} label="Add a task for today" />
      </TaskPanel>
      <TaskDrawerHost
        userId={userId}
        taskParam={typeof task === "string" ? task : undefined}
        ctx={ctx}
      />
    </>
  );
}
