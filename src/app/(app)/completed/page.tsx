import type { Metadata } from "next";
import { EmptyState } from "@/components/shell/empty-state";
import { PageHeader } from "@/components/shell/page-header";
import { formatDayHeading } from "@/lib/dates";
import { TaskDrawerHost } from "@/modules/todos/components/task-drawer-host";
import { TaskList } from "@/modules/todos/components/task-groups";
import type { TagsById } from "@/modules/todos/components/types";
import { loadDateContext } from "@/modules/todos/date-context";
import { groupCompletedByDay } from "@/modules/todos/day-views";
import { listTags } from "@/server/data/tags";
import { getCompletedTasks } from "@/server/data/views";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Completed" };

const LIMIT = 200;

export default async function CompletedPage({ searchParams }: PageProps<"/completed">) {
  const { userId } = await requireUser();
  const [{ ctx, timeZone }, { task }, tags, tasks] = await Promise.all([
    loadDateContext(userId),
    searchParams,
    listTags(userId),
    getCompletedTasks(userId, LIMIT),
  ]);
  const days = groupCompletedByDay(tasks, timeZone);
  const tagsById: TagsById = Object.fromEntries(tags.map((t) => [t.id, t]));

  return (
    <>
      <PageHeader
        title="Completed"
        description={
          tasks.length >= LIMIT
            ? `Your ${LIMIT} most recently finished tasks, newest first.`
            : "Finished tasks, newest first."
        }
      />

      {days.length === 0 ? (
        <EmptyState
          title="Nothing finished yet"
          hint="Tick a task off and it will appear here, grouped by the day you finished it."
        />
      ) : null}

      <div className="flex flex-col gap-6">
        {days.map((day) => (
          <section key={day.date} aria-labelledby={`done-${day.date}`}>
            <h2 id={`done-${day.date}`} className="mb-1 border-b pb-1 text-sm font-semibold">
              {formatDayHeading(day.date, ctx.today, ctx.locale)}{" "}
              <span className="font-normal text-muted-foreground">{day.tasks.length}</span>
            </h2>
            <TaskList tasks={day.tasks} allTasks={[]} tagsById={tagsById} ctx={ctx} />
          </section>
        ))}
      </div>
      <TaskDrawerHost
        userId={userId}
        taskParam={typeof task === "string" ? task : undefined}
        ctx={ctx}
      />
    </>
  );
}
