"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { moreTasksAction } from "../../actions";
import type { DraftPlan, DraftTask, PlanPhase } from "../../schema";
import { ReviewScreen } from "../review/review-screen";
import { call } from "./call";
import { FlowFrame, flowButton } from "./flow-frame";
import { MakingStep, useMake } from "./making-step";
import type { FlowDates } from "./types";

/**
 * `/plans/[id]/more`: "Add more tasks" for a plan that is already running. Ledge looks at what is
 * done and what is open (the plan's own task titles only) and suggests next steps, which go
 * through the same review as a new plan.
 */
export function MoreFlow({
  planId,
  title,
  phases,
  startDate,
  endDate,
  dates,
}: {
  planId: string;
  title: string;
  phases: PlanPhase[];
  startDate: string;
  endDate: string;
  dates: FlowDates;
}) {
  const router = useRouter();
  const [tasks, setTasks] = useState<DraftTask[] | null>(null);
  const back = () => router.push(`/plans/${planId}`);
  const make = useMake(
    () => call(moreTasksAction({ planId })),
    (data) => setTasks(data.tasks),
  );

  if (tasks === null) {
    return (
      <MakingStep
        status={make.status}
        reason={make.reason}
        eyebrow="More tasks"
        heading={`Looking at ${title} for the next steps`}
        note="Ledge reads what is done and what is open. Usually under 20 seconds."
        errorHeading="Ledge couldn't suggest more tasks right now."
        saveDraftLabel="Back to the plan"
        onRetry={make.retry}
        onSaveDraft={back}
        onClose={back}
      />
    );
  }

  if (tasks.length === 0) {
    return (
      <FlowFrame progress={null} eyebrow="More tasks" onClose={back}>
        <div className="my-auto flex flex-col items-center gap-3 rounded-3xl bg-dash-card px-6 py-8 text-center ring-1 ring-dash-edge">
          <div className="font-display text-xl font-semibold text-dash-ink">
            No new suggestions right now.
          </div>
          <p className="text-sm text-dash-ink-soft">
            The plan already covers what Ledge can see. Finish a few tasks and ask again.
          </p>
          <button type="button" onClick={back} className={flowButton()}>
            Back to the plan
          </button>
        </div>
      </FlowFrame>
    );
  }

  const draft: DraftPlan = {
    title,
    listName: title,
    summary: "",
    startDate,
    endDate,
    phases,
    tasks,
    resources: [],
  };
  return <ReviewScreen mode="more" planId={planId} draft={draft} basics={null} dates={dates} />;
}
