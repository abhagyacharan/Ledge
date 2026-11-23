import { Plus, Target } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { dashButton } from "@/components/dash/dash-button";
import { PageTitle } from "@/components/dash/page-title";
import { EmptyState } from "@/components/shell/empty-state";
import { todayIn } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { DraftCard } from "@/modules/planner/components/plans/draft-card";
import { NewPlanShortcut } from "@/modules/planner/components/plans/new-plan-shortcut";
import { PlanCard } from "@/modules/planner/components/plans/plan-card";
import { PlansFilter } from "@/modules/planner/components/plans/plans-filter";
import {
  countByFilter,
  draftStepText,
  FILTER_LABELS,
  inFilter,
  monthAiLine,
  parseFilter,
  type PlanFilter,
} from "@/modules/planner/plan-view";
import { getAiUsageSummary } from "@/server/data/ai-usage";
import { listPlans } from "@/server/data/plans";
import { getUserSettings } from "@/server/data/settings";
import { plannerAvailable } from "@/server/planner";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Plans" };

const EMPTY: Record<Exclude<PlanFilter, "active">, string> = {
  drafts: "A plan you start and leave shows up here.",
  done: "A plan you finish moves here.",
  archived: "Archived plans keep their history here.",
};

/**
 * Plans home (docs/plans designs 8a, 8b, 8l): every plan with its progress. Drafts come first under
 * Active with a dashed edge, then plans, the most recently touched with the orange ring. The filter
 * lives in the URL (`?status=`).
 */
export default async function PlansPage({ searchParams }: PageProps<"/plans">) {
  const { userId } = await requireUser();
  const [{ status }, settings, plans, usage] = await Promise.all([
    searchParams,
    getUserSettings(userId),
    listPlans(userId),
    getAiUsageSummary(userId),
  ]);
  const filter = parseFilter(status);
  const available = plannerAvailable();
  const today = todayIn(settings.timezone);
  const counts = countByFilter(plans);
  const shown = plans.filter((p) => inFilter(p, filter));
  const drafts = shown.filter((p) => p.status === "draft");
  const rest = shown.filter((p) => p.status !== "draft");
  // Only the plan touched most recently gets the orange ring (any active plan, whatever the filter).
  let recent: string | null = null;
  let recentAt = 0;
  for (const p of plans) {
    if (p.status === "active" && p.touchedAt.getTime() > recentAt) {
      recent = p.id;
      recentAt = p.touchedAt.getTime();
    }
  }
  const none = plans.length === 0;

  return (
    <div className="dash mx-auto max-w-[880px]">
      <NewPlanShortcut enabled={available} />
      <PageTitle
        back={{ href: "/", label: "Home" }}
        title="Plans"
        action={
          available ? (
            <Link
              href="/plans/new"
              aria-keyshortcuts="n"
              className={cn(dashButton(), "h-11 gap-2 px-4 md:h-11 md:px-[18px]")}
            >
              <Plus aria-hidden />
              New plan
              <kbd
                aria-hidden
                className="hidden rounded-[5px] px-1.5 py-0.5 font-mono text-[11px] font-medium opacity-80 shadow-[inset_0_0_0_1px_currentColor] md:inline"
              >
                N
              </kbd>
            </Link>
          ) : (
            <span
              aria-disabled="true"
              className={cn(dashButton(), "h-11 gap-2 px-4 opacity-50 md:h-11")}
            >
              <Plus aria-hidden />
              New plan
            </span>
          )
        }
      />
      <p className="-mt-3 mb-5 hidden text-sm text-dash-ink-soft md:block">
        Goals turned into tasks. Their tasks also show in Today and Upcoming.
      </p>

      {!available ? (
        <p
          role="note"
          className="mb-4 rounded-2xl bg-dash-well px-4 py-3 text-[13px] leading-relaxed text-dash-ink"
        >
          The planner isn&apos;t set up on this server yet. It needs a Groq key (
          <span className="font-mono">GROQ_API_KEY</span>) to ask questions and draft plans. Your
          existing plans still work.
        </p>
      ) : null}

      {none ? (
        <div className="mt-2 rounded-3xl border border-dash-edge bg-dash-card p-2 shadow-(--dash-card-shadow) md:mt-4">
          <EmptyState
            icon={Target}
            title="Plan a goal and Ledge turns it into tasks."
            hint="Say what you want to do. Ledge asks a few questions, then drafts dated tasks for you to keep or cut."
            action={
              available ? (
                <Link href="/plans/new" className={cn(dashButton(), "h-12 gap-2 px-5 md:h-11")}>
                  <Plus aria-hidden />
                  New plan
                </Link>
              ) : undefined
            }
          />
        </div>
      ) : (
        <>
          <PlansFilter current={filter} counts={counts} />
          <div className="mt-4 grid gap-3 md:grid-cols-2 md:gap-4">
            {drafts.map((p) => (
              <DraftCard
                key={p.id}
                planId={p.id}
                title={p.title}
                goal={p.goal}
                stepText={draftStepText(p)}
              />
            ))}
            {rest.map((p) => (
              <PlanCard
                key={p.id}
                plan={p}
                accent={p.id === recent}
                today={today}
                locale={settings.locale}
              />
            ))}
            {filter === "active" && available ? (
              <Link
                href="/plans/new"
                className="hidden min-h-[196px] flex-col items-center justify-center gap-2.5 rounded-3xl border border-dash-edge text-sm font-medium text-dash-ink-soft outline-none transition-colors duration-150 hover:bg-dash-well/60 focus-visible:shadow-[0_0_0_2px_var(--background),0_0_0_4px_var(--dash-ink)] md:flex"
              >
                <span
                  aria-hidden
                  className="grid size-11 place-items-center rounded-full bg-dash-well text-dash-ink"
                >
                  <Plus className="size-[18px]" />
                </span>
                Plan another goal
              </Link>
            ) : null}
          </div>
          {shown.length === 0 && filter !== "active" ? (
            <div className="rounded-2xl border border-dash-edge bg-dash-card shadow-(--dash-card-shadow)">
              <EmptyState title={`Nothing in ${FILTER_LABELS[filter]}`} hint={EMPTY[filter]} />
            </div>
          ) : null}
          <Link
            href="/settings/voice#ai-usage"
            className="mx-auto mt-3 flex min-h-11 w-fit items-center gap-1.5 text-xs text-dash-ink-soft outline-none hover:text-dash-ink focus-visible:shadow-[0_0_0_2px_var(--background),0_0_0_4px_var(--dash-ink)] md:mx-0"
          >
            AI this month:{" "}
            <span className="font-mono">
              {monthAiLine(usage.thisMonth.requests, usage.thisMonth.costMicros)}
            </span>
          </Link>
        </>
      )}
    </div>
  );
}
