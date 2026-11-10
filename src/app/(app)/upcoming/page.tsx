import type { Metadata } from "next";
import { EmptyState } from "@/components/shell/empty-state";
import { PageHeader } from "@/components/shell/page-header";
import { addDaysIso, formatDayHeading } from "@/lib/dates";
import { InlineAdd } from "@/modules/todos/components/inline-add";
import { QuickAddButton } from "@/modules/todos/components/quick-add-button";
import { TaskDrawerHost } from "@/modules/todos/components/task-drawer-host";
import { TaskList } from "@/modules/todos/components/task-groups";
import type { TagsById } from "@/modules/todos/components/types";
import { loadDateContext } from "@/modules/todos/date-context";
import { groupUpcoming } from "@/modules/todos/day-views";
import { getInbox } from "@/server/data/lists";
import { listTags } from "@/server/data/tags";
import { getDueBetweenTasks } from "@/server/data/views";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Upcoming" };

const DAYS = 14;

export default async function UpcomingPage({ searchParams }: PageProps<"/upcoming">) {
  const { userId } = await requireUser();
  const [{ ctx }, { task }, inbox, tags] = await Promise.all([
    loadDateContext(userId),
    searchParams,
    getInbox(userId),
    listTags(userId),
  ]);
  const tomorrow = addDaysIso(ctx.today, 1);
  const tasks = await getDueBetweenTasks(userId, tomorrow, addDaysIso(ctx.today, DAYS));
  const days = groupUpcoming(tasks, ctx.today, DAYS);
  const tagsById: TagsById = Object.fromEntries(tags.map((t) => [t.id, t]));

  return (
    <>
      <PageHeader
        title="Upcoming"
        description={`The next ${DAYS} days. Tasks without a date are not shown.`}
      />

      {days.length === 0 ? (
        <EmptyState
          title="Nothing coming up"
          hint={`No tasks are due in the next ${DAYS} days.`}
          action={<QuickAddButton />}
        />
      ) : null}

      <div className="flex flex-col gap-6">
        {days.map((day) => (
          <section key={day.date} aria-labelledby={`day-${day.date}`}>
            <h2 id={`day-${day.date}`} className="mb-1 border-b pb-1 text-sm font-semibold">
              {formatDayHeading(day.date, ctx.today, ctx.locale)}{" "}
              <span className="font-normal text-muted-foreground">{day.tasks.length}</span>
            </h2>
            <TaskList tasks={day.tasks} allTasks={[]} tagsById={tagsById} ctx={ctx} />
          </section>
        ))}
      </div>

      <div className="mt-6">
        <InlineAdd listId={inbox.id} dueDate={tomorrow} label="Add a task for tomorrow" />
      </div>
      <TaskDrawerHost
        userId={userId}
        taskParam={typeof task === "string" ? task : undefined}
        ctx={ctx}
      />
    </>
  );
}
