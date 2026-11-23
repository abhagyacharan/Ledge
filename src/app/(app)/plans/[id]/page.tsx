import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { daysBetween, formatDate, formatRowDay, todayIn } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { AddMoreCard, DoneCard, MarkDoneCard } from "@/modules/planner/components/plans/plan-cards";
import { PlanMenu } from "@/modules/planner/components/plans/plan-menu";
import { PlanResources } from "@/modules/planner/components/plans/plan-resources";
import { PlanTasks } from "@/modules/planner/components/plans/plan-tasks";
import { PlanTold } from "@/modules/planner/components/plans/plan-told";
import { StatusPill } from "@/modules/planner/components/plans/status-pill";
import {
  lengthWords,
  planAiLine,
  progressLine,
  timeWords,
  toldRows,
} from "@/modules/planner/plan-view";
import { labelPhases } from "@/modules/planner/phase-label";
import { loadDateContext } from "@/modules/todos/date-context";
import { TaskDrawerHost } from "@/modules/todos/components/task-drawer-host";
import { id as uuid } from "@/modules/todos/schema";
import { getPlanAiUsage } from "@/server/data/ai-usage";
import { getPlan, getPlanTasks } from "@/server/data/plans";
import { getUserSettings } from "@/server/data/settings";
import { plannerAvailable } from "@/server/planner";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Plan" };

/**
 * A plan's page (docs/plans designs 8j, 8k, 8l): its progress, its phases as the app's real task
 * rows (the same tasks that show in Today and Upcoming), "Add more tasks", resources, what you told
 * Ledge, and what the AI used. A draft is not a page: it goes back to its setup.
 */
export default async function PlanPage({ params, searchParams }: PageProps<"/plans/[id]">) {
  const { userId } = await requireUser();
  const [{ id }, { task }] = await Promise.all([params, searchParams]);
  const parsed = uuid.safeParse(id);
  if (!parsed.success) notFound();
  const plan = await getPlan(userId, parsed.data);
  if (!plan) notFound(); // someone else's plan looks exactly like a missing one
  if (plan.status === "draft") redirect(`/plans/${plan.id}/setup`);

  const [{ ctx }, settings, tasks, usage] = await Promise.all([
    loadDateContext(userId),
    getUserSettings(userId),
    getPlanTasks(userId, plan.id),
    getPlanAiUsage(userId, plan.id),
  ]);

  const top = tasks.filter((t) => t.parentId === null);
  const done = top.filter((t) => t.status === "done").length;
  const total = top.length;
  const open = top.filter((t) => t.status === "open");
  const daysLeft = plan.endDate ? daysBetween(ctx.today, plan.endDate) : null;
  const finished = plan.status === "done";
  const folding = plan.status === "active";
  const percent = total > 0 ? (done / total) * 100 : 0;
  const finishedOn = plan.completedAt
    ? formatDate(todayIn(settings.timezone, plan.completedAt), ctx.locale)
    : null;
  const shortDay = (iso: string) => formatRowDay(iso, ctx.today, ctx.locale);
  const range =
    plan.startDate && plan.endDate
      ? `${shortDay(plan.startDate)} – ${shortDay(plan.endDate)}`
      : plan.endDate
        ? `Ends ${shortDay(plan.endDate)}`
        : null;
  const minutes = plan.basics ? timeWords(plan.basics) : null;
  const told = toldRows(
    plan.basics
      ? {
          length: lengthWords(plan.basics, (iso) => shortDay(iso)),
          time: timeWords(plan.basics),
        }
      : null,
    plan.answers,
  );
  const days =
    plan.startDate && plan.endDate ? daysBetween(plan.startDate, plan.endDate) + 1 : null;
  const doneSummary = `${total} ${total === 1 ? "task" : "tasks"}${days ? ` over ${days} ${days === 1 ? "day" : "days"}` : ""}. Keep going with a follow-up plan, or archive this one.`;

  return (
    <div className="dash mx-auto max-w-[880px]">
      <header className="mb-4 flex flex-col md:mb-5">
        <Link
          href="/plans"
          className="-ml-2 inline-flex h-11 w-fit items-center gap-1 rounded-full pr-3 pl-1.5 text-[13px] font-medium text-dash-ink-soft outline-none transition-colors duration-150 hover:text-dash-ink focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <ChevronLeft aria-hidden className="size-4" />
          Plans
        </Link>
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
            <h1 className="font-display text-[32px] leading-[1.1] font-semibold tracking-[-0.015em] break-words text-dash-ink md:text-[40px] md:tracking-[-0.02em]">
              {plan.title}
            </h1>
            <StatusPill status={plan.status} />
          </div>
          <PlanMenu
            plan={{
              id: plan.id,
              title: plan.title,
              status: plan.status as "active" | "done" | "archived",
              endDate: plan.endDate,
              taskCount: total,
              doneCount: done,
            }}
            openTasks={open.map((t) => ({
              id: t.id,
              title: t.title,
              dueDate: t.dueDate,
              recurrenceUntil: t.recurrenceUntil,
            }))}
            ctx={ctx}
          />
        </div>
      </header>

      <section
        aria-label="Progress"
        className="mb-4 flex flex-col md:mb-5 md:rounded-2xl md:border md:border-dash-edge md:bg-dash-card md:px-5 md:py-4 md:shadow-(--dash-card-shadow)"
      >
        <div
          role="progressbar"
          aria-label="Plan progress"
          aria-valuenow={done}
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuetext={`${done} of ${total} done`}
          className="h-1.5 overflow-hidden rounded-[3px] bg-dash-track md:order-2 md:mt-2.5 md:h-2 md:rounded-[4px]"
        >
          <div
            className="h-full bg-dash-accent transition-[width] duration-300 ease-out motion-reduce:transition-none"
            style={{ width: `${percent}%` }}
          />
        </div>
        <div className="mt-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 font-mono text-xs font-medium text-dash-ink-soft md:order-1 md:mt-0 md:text-[13px]">
          <span className="text-dash-ink">
            {progressLine(done, total, daysLeft, {
              word: true,
              finished: finished || plan.status === "archived",
            })}
          </span>
          <span className={cn(range && "md:hidden")}>
            {finished && finishedOn
              ? `Finished ${finishedOn}`
              : plan.endDate
                ? `Ends ${shortDay(plan.endDate)}`
                : null}
          </span>
          {range ? (
            <span className="hidden md:inline">
              {finished && finishedOn ? `Finished ${finishedOn}` : range}
              {minutes && !finished ? ` · ${minutes}` : ""}
            </span>
          ) : null}
        </div>
      </section>

      <div className="flex flex-col gap-3 md:gap-4">
        {finished ? (
          <DoneCard planId={plan.id} title={plan.title} summary={doneSummary} />
        ) : plan.status === "active" && total > 0 && done === total ? (
          <MarkDoneCard planId={plan.id} title={plan.title} />
        ) : null}

        <PlanTasks
          phases={labelPhases(plan.phases, plan.startDate, plan.endDate)}
          tasks={tasks}
          milestoneIds={plan.milestoneTaskIds}
          ctx={ctx}
          folding={folding}
        />

        <div className="grid gap-3 md:grid-cols-2 md:gap-4">
          {plan.status === "active" ? (
            <AddMoreCard planId={plan.id} available={plannerAvailable()} />
          ) : null}
          <PlanResources planId={plan.id} resources={plan.resources} />
        </div>

        <PlanTold goal={plan.goal} rows={told} />

        {usage.requests > 0 ? (
          <p className="px-1 text-center text-xs leading-relaxed text-dash-ink-soft md:text-left">
            AI used for this plan:
            <br className="md:hidden" />
            <span className="font-mono md:ml-1.5">{planAiLine(usage, settings.usdToInr)}</span>
          </p>
        ) : null}
      </div>

      <TaskDrawerHost
        userId={userId}
        taskParam={typeof task === "string" ? task : undefined}
        ctx={ctx}
      />
    </div>
  );
}
