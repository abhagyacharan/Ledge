import { AlertCircle } from "lucide-react";
import type { Metadata } from "next";
import { EmptyState } from "@/components/shell/empty-state";
import { PageHeader } from "@/components/shell/page-header";
import { formatLongDate } from "@/lib/dates";
import { InlineAdd } from "@/modules/todos/components/inline-add";
import { QuickAddButton } from "@/modules/todos/components/quick-add-button";
import { TaskDrawerHost } from "@/modules/todos/components/task-drawer-host";
import { TaskList } from "@/modules/todos/components/task-groups";
import type { TagsById } from "@/modules/todos/components/types";
import { loadDateContext } from "@/modules/todos/date-context";
import { splitToday } from "@/modules/todos/day-views";
import { getInbox } from "@/server/data/lists";
import { listTags } from "@/server/data/tags";
import { getDueByTasks } from "@/server/data/views";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Today" };

export default async function TodayPage({ searchParams }: PageProps<"/today">) {
  const { userId } = await requireUser();
  const [{ ctx }, { task }, inbox, tags] = await Promise.all([
    loadDateContext(userId),
    searchParams,
    getInbox(userId),
    listTags(userId),
  ]);
  const tasks = await getDueByTasks(userId, ctx.today);
  const { overdue, today } = splitToday(tasks, ctx);
  const tagsById: TagsById = Object.fromEntries(tags.map((t) => [t.id, t]));

  return (
    <>
      <PageHeader title="Today" description={formatLongDate(ctx.today, ctx.locale)} />

      {overdue.length === 0 && today.length === 0 ? (
        <EmptyState
          title="Nothing due today"
          hint="Tasks due today, and anything overdue, show up here."
          action={<QuickAddButton />}
        />
      ) : null}

      {overdue.length > 0 ? (
        <section aria-labelledby="overdue-heading" className="mb-6">
          <h2
            id="overdue-heading"
            className="mb-1 flex items-center gap-1.5 border-b pb-1 text-sm font-semibold text-destructive"
          >
            <AlertCircle className="size-4" aria-hidden />
            Overdue <span className="font-normal">{overdue.length}</span>
          </h2>
          <TaskList tasks={overdue} allTasks={[]} tagsById={tagsById} ctx={ctx} />
        </section>
      ) : null}

      {today.length > 0 ? (
        <section aria-labelledby="today-heading" className="mb-6">
          <h2 id="today-heading" className="mb-1 border-b pb-1 text-sm font-semibold">
            Today <span className="font-normal text-muted-foreground">{today.length}</span>
          </h2>
          <TaskList tasks={today} allTasks={[]} tagsById={tagsById} ctx={ctx} />
        </section>
      ) : null}

      <InlineAdd listId={inbox.id} dueDate={ctx.today} label="Add a task for today" />
      <TaskDrawerHost
        userId={userId}
        taskParam={typeof task === "string" ? task : undefined}
        ctx={ctx}
      />
    </>
  );
}
