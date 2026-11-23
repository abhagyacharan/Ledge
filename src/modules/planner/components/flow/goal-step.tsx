"use client";

import { ArrowRight, Loader2, Mic, Square } from "lucide-react";
import { useCallback, useState } from "react";
import { cn } from "@/lib/utils";
import { GOAL_MAX } from "../../schema";
import { FlowFrame, flowButton } from "./flow-frame";
import { stepEyebrow, stepProgress } from "./progress";
import { useGoalVoice } from "./use-goal-voice";

const EXAMPLES = ["Run a 5k in 8 weeks", "Cook 10 new dinners", "Learn basic Spanish"];
/** Next turns on from this many characters (the server accepts 5). */
const GOAL_NEXT_MIN = 10;

/**
 * Step 1 of 4 (screen 8c): the goal in the person's own words, with examples and a microphone.
 * `onSubmit` returns an error message to show, or null when it moved on.
 */
export function GoalStep({
  initial,
  warnOnChange,
  voice,
  onSubmit,
  onClose,
}: {
  initial: string;
  /** True when changing the goal would throw away later answers or a made plan. */
  warnOnChange: boolean;
  voice: boolean;
  onSubmit: (goal: string) => Promise<string | null>;
  onClose: () => void;
}) {
  const [goal, setGoal] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const speak = useGoalVoice(
    useCallback(
      (text: string) =>
        setGoal((current) =>
          `${current.trim() ? `${current.trim()} ` : ""}${text}`.slice(0, GOAL_MAX),
        ),
      [],
    ),
  );

  const ready = goal.trim().length >= GOAL_NEXT_MIN && !busy;
  async function next() {
    if (!ready) return;
    setBusy(true);
    setError(null);
    const problem = await onSubmit(goal.trim());
    if (problem) {
      setError(problem);
      setBusy(false);
    }
  }

  const changed = goal.trim() !== initial.trim();
  const screen = { name: "goal" } as const;

  return (
    <FlowFrame
      progress={stepProgress(screen)}
      eyebrow={stepEyebrow(screen)}
      onClose={onClose}
      busy={busy}
      footer={
        <button
          type="button"
          disabled={!ready}
          onClick={next}
          className={cn(flowButton(), "flex-1")}
        >
          {busy ? <Loader2 aria-hidden className="size-[18px] animate-spin" /> : null}
          Next
          {busy ? null : <ArrowRight aria-hidden className="size-[18px]" />}
        </button>
      }
    >
      <label htmlFor="plan-goal" className="mt-3 font-mono text-xs font-medium text-dash-ink-soft">
        Your goal, in your own words
      </label>
      <textarea
        id="plan-goal"
        autoFocus
        value={goal}
        maxLength={GOAL_MAX}
        placeholder="What do you want to do?"
        onChange={(e) => setGoal(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            void next();
          }
        }}
        aria-describedby="plan-goal-count"
        className="block min-h-[230px] w-full resize-none bg-transparent text-[22px] leading-[1.45] font-medium text-dash-ink outline-none placeholder:text-dash-ink-soft/70 md:min-h-[200px]"
      />
      <div className="flex items-center justify-between gap-3">
        {voice ? (
          <button
            type="button"
            onClick={() => void speak.toggle()}
            disabled={speak.state === "working"}
            aria-pressed={speak.state === "listening"}
            className={cn(
              "inline-flex h-11 items-center gap-2 rounded-full px-4 text-sm font-medium outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-60",
              speak.state === "listening"
                ? "bg-dash-ink text-dash-card"
                : "bg-dash-well text-dash-ink hover:bg-dash-edge",
            )}
          >
            {speak.state === "working" ? (
              <Loader2 aria-hidden className="size-4 animate-spin" />
            ) : speak.state === "listening" ? (
              <Square aria-hidden className="size-3.5 fill-current" />
            ) : (
              <Mic aria-hidden className="size-4" />
            )}
            {speak.state === "listening"
              ? "Tap to finish"
              : speak.state === "working"
                ? "Listening back…"
                : "Speak your goal"}
          </button>
        ) : (
          <span />
        )}
        <span id="plan-goal-count" className="font-mono text-xs font-medium text-dash-ink-soft">
          {goal.length.toLocaleString("en")} / {GOAL_MAX.toLocaleString("en")}
        </span>
      </div>
      {speak.message || speak.tooLong ? (
        <p role="status" className="text-[13px] text-dash-ink-soft">
          {speak.message ?? "That was the longest clip Ledge can take, so it stopped listening."}
        </p>
      ) : null}
      {warnOnChange && changed ? (
        <p role="status" className="text-[13px] font-medium text-dash-warn">
          Changing your goal clears your later answers and the plan made from them.
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="text-[13px] font-medium text-dash-bad">
          {error}
        </p>
      ) : null}
      <div className="mt-2 text-xs font-medium text-dash-ink-soft">Or start from an example</div>
      <div className="flex flex-wrap gap-2">
        {EXAMPLES.map((example) => (
          <button
            key={example}
            type="button"
            onClick={() => setGoal(example)}
            className="h-11 rounded-full bg-dash-well px-4 text-sm font-medium text-dash-ink outline-none transition-colors hover:bg-dash-edge focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {example}
          </button>
        ))}
      </div>
    </FlowFrame>
  );
}
