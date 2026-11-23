import type { PlanStep } from "@/server/db/schema";
import type { PlanAnswer, PlanQuestion } from "../../schema";

/** What `draftStepLabel` reads from a plan (a `PlanRecord` fits). */
export type StepLabelInput = {
  step: PlanStep | null;
  questions: PlanQuestion[] | null;
  followups: PlanQuestion[] | null;
  answers: PlanAnswer[];
};

/**
 * Where a draft stands, for the Plans home: "Draft · question 3 of 5", "Draft · basics",
 * "Draft · ready to review". The number is the question the person will see next.
 */
export function draftStepLabel(plan: StepLabelInput): string {
  switch (plan.step) {
    case "goal":
      return "Draft · goal";
    case "basics":
      return "Draft · basics";
    case "questions": {
      const asked = plan.questions ?? [];
      if (asked.length === 0) return "Draft · questions";
      const ids = new Set(asked.map((q) => q.id));
      const answered = plan.answers.filter((a) => ids.has(a.questionId)).length;
      return `Draft · question ${Math.min(answered + 1, asked.length)} of ${asked.length}`;
    }
    case "followups": {
      const asked = plan.followups ?? [];
      if (asked.length === 0) return "Draft · follow-ups";
      const ids = new Set(asked.map((q) => q.id));
      const answered = plan.answers.filter((a) => ids.has(a.questionId)).length;
      return `Draft · follow-up ${Math.min(answered + 1, asked.length)} of ${asked.length}`;
    }
    case "making":
      return "Draft · making";
    default:
      return "Draft · ready to review";
  }
}
