"use client";

import { ArrowLeft, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Result } from "@/lib/result";
import { cn } from "@/lib/utils";
import {
  askFollowupsAction,
  askQuestionsAction,
  makePlanAction,
  saveAnswersAction,
  saveBasicsAction,
  saveFollowupAnswersAction,
  saveGoalAction,
} from "../../actions";
import {
  describeBasics,
  type DraftPlan,
  type PlanAnswer,
  type PlanBasics,
  type PlanQuestion,
} from "../../schema";
import { ReviewScreen } from "../review/review-screen";
import { BasicsStep } from "./basics-step";
import { call, problemOf } from "./call";
import { FlowFrame, flowButton } from "./flow-frame";
import { GoalStep } from "./goal-step";
import { MakingStep, useMake } from "./making-step";
import { stepProgress } from "./progress";
import { QuestionStep } from "./question-step";
import type { FlowDates, SetupPlan } from "./types";

type Screen = "goal" | "basics" | "askQ" | "questions" | "askF" | "followups" | "making" | "review";

function firstScreen(plan: SetupPlan): Screen {
  switch (plan.step) {
    case "goal":
      return "goal";
    case "basics":
      return "basics";
    case "questions":
      return plan.questions && plan.questions.length > 0 ? "questions" : "askQ";
    case "followups":
      return plan.followups && plan.followups.length > 0 ? "followups" : "making";
    case "making":
      return "making";
    case "review":
      return plan.draft ? "review" : "making";
    default:
      return plan.draft ? "review" : "basics";
  }
}

/**
 * `/plans/[id]/setup`: the steps of a draft, resumed where it was left. Every step saves as it
 * goes (the actions store the answers on the draft), so closing the page loses nothing.
 */
export function SetupFlow({
  plan,
  dates,
  voice,
}: {
  plan: SetupPlan;
  dates: FlowDates;
  voice: boolean;
}) {
  const router = useRouter();
  const planId = plan.id;
  const [screen, setScreen] = useState<Screen>(() => firstScreen(plan));
  const [goal, setGoal] = useState(plan.goal);
  const [basics, setBasics] = useState<PlanBasics | null>(plan.basics);
  const [questions, setQuestions] = useState<PlanQuestion[] | null>(plan.questions);
  const [followups, setFollowups] = useState<PlanQuestion[] | null>(plan.followups);
  const [answers, setAnswers] = useState<PlanAnswer[]>(plan.answers);
  const [draft, setDraft] = useState<DraftPlan | null>(plan.draft);
  const [startIndex, setStartIndex] = useState(0);

  const leave = () => router.push("/plans");
  const hasLater = Boolean(questions?.length) || answers.length > 0 || draft !== null;

  const idsOf = (list: PlanQuestion[] | null) => new Set((list ?? []).map((q) => q.id));
  const roundAnswers = (list: PlanQuestion[] | null) => {
    const ids = idsOf(list);
    return answers.filter((a) => ids.has(a.questionId));
  };
  const mergeRound = (list: PlanQuestion[] | null, next: PlanAnswer[]) => {
    const ids = idsOf(list);
    setAnswers((prev) => [...prev.filter((a) => !ids.has(a.questionId)), ...next]);
  };

  switch (screen) {
    case "goal":
      return (
        <GoalStep
          initial={goal}
          warnOnChange={hasLater}
          voice={voice}
          onClose={leave}
          onSubmit={async (next) => {
            if (next !== goal.trim()) {
              const result = await call(saveGoalAction({ planId, goal: next }));
              if (!result.ok) return problemOf(result);
              setGoal(next);
              setQuestions(null);
              setFollowups(null);
              setAnswers([]);
              setDraft(null);
            }
            setScreen("basics");
            return null;
          }}
        />
      );

    case "basics":
      return (
        <BasicsStep
          initial={basics}
          dates={dates}
          onClose={leave}
          onBack={() => setScreen("goal")}
          onSubmit={async (next) => {
            const result = await call(saveBasicsAction({ planId, basics: next }));
            if (!result.ok) return problemOf(result);
            setBasics(next);
            setScreen(questions && questions.length > 0 ? "questions" : "askQ");
            return null;
          }}
        />
      );

    case "askQ":
      return (
        <AskScreen
          key="askQ"
          heading="Thinking up questions for your goal"
          eyebrow="Questions"
          progress={stepProgress({ name: "questions", index: 0, total: 5 })}
          run={() => askQuestionsAction({ planId })}
          onDone={(data: { questions: PlanQuestion[] }) => {
            setQuestions(data.questions);
            setStartIndex(0);
            setScreen("questions");
          }}
          onBack={() => setScreen("basics")}
          onClose={leave}
        />
      );

    case "questions":
      return (
        <QuestionStep
          key={`q-${startIndex}`}
          round="main"
          voice={voice}
          questions={questions ?? []}
          initialAnswers={roundAnswers(questions)}
          startIndex={startIndex}
          onClose={leave}
          onBack={() => setScreen("basics")}
          onSave={async (next, done) => {
            const result = await call(saveAnswersAction({ planId, answers: next, done }));
            if (result.ok) mergeRound(questions, next);
            return problemOf(result);
          }}
          onFinished={() =>
            setScreen(followups !== null ? (followups.length > 0 ? "followups" : "making") : "askF")
          }
        />
      );

    case "askF":
      return (
        <AskScreen
          key="askF"
          heading="Checking if anything needs a follow-up"
          eyebrow="Follow-ups"
          progress={stepProgress({ name: "followups", index: 0, total: 1 })}
          run={() => askFollowupsAction({ planId })}
          onDone={(data: { followups: PlanQuestion[] }) => {
            setFollowups(data.followups);
            setStartIndex(0);
            setScreen(data.followups.length > 0 ? "followups" : "making");
          }}
          onBack={() => {
            setStartIndex(Math.max(0, (questions?.length ?? 1) - 1));
            setScreen("questions");
          }}
          skipLabel="Skip follow-ups"
          onSkip={() => setScreen("making")}
          onClose={leave}
        />
      );

    case "followups":
      return (
        <QuestionStep
          key="f"
          round="followup"
          voice={voice}
          questions={followups ?? []}
          initialAnswers={roundAnswers(followups)}
          onClose={leave}
          onBack={() => {
            setStartIndex(Math.max(0, (questions?.length ?? 1) - 1));
            setScreen("questions");
          }}
          onSave={async (next, done) => {
            const result = await call(saveFollowupAnswersAction({ planId, answers: next, done }));
            if (result.ok) mergeRound(followups, next);
            return problemOf(result);
          }}
          onFinished={() => setScreen("making")}
        />
      );

    case "making":
      return (
        <MakingRun
          key="making"
          heading={makingHeading(basics)}
          run={() => makePlanAction({ planId })}
          onDone={(data: { draft: DraftPlan }) => {
            setDraft(data.draft);
            setScreen("review");
          }}
          onClose={leave}
          onSaveDraft={leave}
        />
      );

    case "review":
      return draft ? (
        <ReviewScreen mode="new" planId={planId} draft={draft} basics={basics} dates={dates} />
      ) : null;
  }
}

function makingHeading(basics: PlanBasics | null): string {
  if (!basics) return "Shaping your plan";
  const { length, time } = describeBasics(basics);
  const long = typeof basics.length === "string" ? `a ${length} plan` : `a plan ${length}`;
  return `Shaping ${long} around ${time}`;
}

function MakingRun<T>({
  heading,
  run,
  onDone,
  onClose,
  onSaveDraft,
}: {
  heading: string;
  run: () => Promise<Result<T>>;
  onDone: (data: T) => void;
  onClose: () => void;
  onSaveDraft: () => void;
}) {
  const make = useMake(() => call(run()), onDone);
  return (
    <MakingStep
      status={make.status}
      reason={make.reason}
      heading={heading}
      onRetry={make.retry}
      onSaveDraft={onSaveDraft}
      onClose={onClose}
    />
  );
}

/**
 * A short wait while the AI thinks up the questions (or the follow-ups). If it fails the person
 * can try again, go back, or (for follow-ups) carry on without them.
 */
function AskScreen<T>({
  heading,
  eyebrow,
  progress,
  run,
  onDone,
  onBack,
  onClose,
  skipLabel,
  onSkip,
}: {
  heading: string;
  eyebrow: string;
  progress: number;
  run: () => Promise<Result<T>>;
  onDone: (data: T) => void;
  onBack: () => void;
  onClose: () => void;
  skipLabel?: string;
  onSkip?: () => void;
}) {
  const make = useMake(() => call(run()), onDone);
  if (make.status === "error") {
    return (
      <FlowFrame
        progress={progress}
        eyebrow={eyebrow}
        onClose={onClose}
        closeLabel="Close, your answers are saved"
      >
        <div
          role="alert"
          className="my-auto flex flex-col items-center gap-2.5 rounded-3xl bg-dash-card px-6 py-7 text-center ring-1 ring-dash-edge"
        >
          <div className="font-display text-xl font-semibold text-dash-ink">
            Ledge couldn&apos;t do that right now. Your answers are kept.
          </div>
          <div className="text-sm text-dash-ink-soft">{make.reason}</div>
          <button type="button" onClick={make.retry} className={cn(flowButton(), "mt-2 w-full")}>
            <RotateCcw aria-hidden className="size-[17px]" />
            Try again
          </button>
          {skipLabel && onSkip ? (
            <button
              type="button"
              onClick={onSkip}
              className={cn(flowButton("secondary"), "w-full")}
            >
              {skipLabel}
            </button>
          ) : null}
          <button type="button" onClick={onBack} className={cn(flowButton("ghost"), "w-full")}>
            <ArrowLeft aria-hidden className="size-[17px]" />
            Back
          </button>
        </div>
      </FlowFrame>
    );
  }
  return (
    <FlowFrame progress={progress} eyebrow={eyebrow} onClose={onClose} busy>
      <p
        role="status"
        className="mt-3 font-display text-2xl leading-tight font-semibold text-dash-ink"
      >
        {heading}
      </p>
      <p className="text-sm text-dash-ink-soft">This takes a few seconds.</p>
      <div aria-hidden className="mt-3 flex flex-col gap-2">
        {[88, 72, 80, 64].map((w) => (
          <span key={w} className="dash-skeleton h-14 rounded-[14px]" style={{ width: `${w}%` }} />
        ))}
      </div>
    </FlowFrame>
  );
}
