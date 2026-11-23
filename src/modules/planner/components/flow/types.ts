import type { PlanStep } from "@/server/db/schema";
import type { PlanRecord } from "@/server/data/plans";
import type { DraftPlan, PlanAnswer, PlanBasics, PlanQuestion } from "../../schema";

/** The slice of a draft plan the new-plan flow needs; plain data, safe to hand to the browser. */
export type SetupPlan = {
  id: string;
  goal: string;
  title: string;
  step: PlanStep | null;
  basics: PlanBasics | null;
  questions: PlanQuestion[] | null;
  answers: PlanAnswer[];
  followups: PlanQuestion[] | null;
  draft: DraftPlan | null;
  startDate: string | null;
  endDate: string | null;
};

export function toSetupPlan(plan: PlanRecord): SetupPlan {
  return {
    id: plan.id,
    goal: plan.goal,
    title: plan.title,
    step: plan.step,
    basics: plan.basics,
    questions: plan.questions,
    answers: plan.answers,
    followups: plan.followups,
    draft: plan.draft,
    startDate: plan.startDate,
    endDate: plan.endDate,
  };
}

/** Today, the locale and the week start, worked out on the server in the user's timezone. */
export type FlowDates = { today: string; locale: string; weekStartsOn: number; timeNow: string };
