"use client";

import {
  ArrowLeft,
  ArrowRight,
  Check,
  CircleCheck,
  CornerDownRight,
  Loader2,
  Mic,
  Pencil,
  Square,
} from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { PlanAnswer, PlanQuestion } from "../../schema";
import { FlowFrame, StepHint, StepTitle, flowButton } from "./flow-frame";
import { stepEyebrow, stepProgress } from "./progress";
import { useGoalVoice } from "./use-goal-voice";

const AUTO_ADVANCE_MS = 300;
const TEXT_MAX = 300;

type Props = {
  questions: PlanQuestion[];
  initialAnswers: PlanAnswer[];
  round: "main" | "followup";
  /** Voice is on: "Type my own" and typed answers get a microphone. */
  voice?: boolean;
  /** Autosave: the answers so far; `done` on the last one. Returns an error message or null. */
  onSave: (answers: PlanAnswer[], done: boolean) => Promise<string | null>;
  /** Runs after the last answer was saved. */
  onFinished: () => void;
  /** Back from the first question. */
  onBack: () => void;
  onClose: () => void;
  /** Start on this question (Back from the next step lands on the last one). */
  startIndex?: number;
};

function emptyAnswer(q: PlanQuestion): PlanAnswer {
  return {
    questionId: q.id,
    question: q.text.slice(0, 300),
    kind: q.kind,
    value: null,
    custom: null,
  };
}

const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable || target.tagName === "INPUT" || target.tagName === "TEXTAREA");
const isPressable = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  target.closest("button, a, [role=radio], [role=checkbox]") !== null;

/**
 * Steps 3 and 3b (screens 8e, 8f): one question per screen, four kinds, "Type my own", Skip.
 * Number keys pick, Enter is Next, Esc or Backspace on an empty field is Back. Every answer is
 * saved as you leave its question, so closing the page loses nothing.
 */
export function QuestionStep({
  questions: asked,
  initialAnswers,
  round,
  voice = false,
  onSave,
  onFinished,
  onBack,
  onClose,
  startIndex = 0,
}: Props) {
  // A follow-up digs into one answer, where more than one thing is often true: pick several.
  const questions = useMemo(
    () =>
      round === "followup"
        ? asked.map((x) => (x.kind === "single" ? { ...x, kind: "multi" as const } : x))
        : asked,
    [asked, round],
  );
  const total = questions.length;
  const [index, setIndex] = useState(Math.min(Math.max(startIndex, 0), total - 1));
  const [answers, setAnswers] = useState<Record<string, PlanAnswer>>(() => {
    const map: Record<string, PlanAnswer> = {};
    for (const a of initialAnswers) map[a.questionId] = a;
    return map;
  });
  const [customOpen, setCustomOpen] = useState<Record<string, boolean>>(() => {
    const open: Record<string, boolean> = {};
    for (const a of initialAnswers) if (a.custom) open[a.questionId] = true;
    return open;
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<number | null>(null);
  /** Saves run one after another, so the last write is always the newest. */
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const customInput = useRef<HTMLTextAreaElement>(null);

  const q = questions[index];
  const answer = answers[q.id] ?? emptyAnswer(q);
  const last = index === total - 1;
  const showCustom = Boolean(customOpen[q.id]);

  // Spoken words land in this question's own answer (the text box, or "Type my own").
  const current = useRef({ q, answer });
  useEffect(() => {
    current.current = { q, answer };
  });
  const speak = useGoalVoice(
    useCallback((text: string) => {
      const { q: now, answer: a } = current.current;
      const join = (before: string | null) =>
        `${before?.trim() ? `${before.trim()} ` : ""}${text}`.slice(0, TEXT_MAX);
      const next: PlanAnswer =
        now.kind === "text"
          ? { ...a, value: join(typeof a.value === "string" ? a.value : "") }
          : {
              ...a,
              value: now.kind === "multi" ? a.value : null,
              custom: join(a.custom),
            };
      if (timer.current !== null) window.clearTimeout(timer.current);
      timer.current = null;
      setAnswers((map) => ({ ...map, [now.id]: next }));
      if (now.kind !== "text") setCustomOpen((open) => ({ ...open, [now.id]: true }));
    }, []),
  );

  const clearTimer = useCallback(() => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
  }, []);
  useEffect(() => clearTimer, [clearTimer]);

  const ordered = (map: Record<string, PlanAnswer>) =>
    questions.map((x) => map[x.id]).filter((a): a is PlanAnswer => Boolean(a));

  function update(next: PlanAnswer) {
    clearTimer();
    setAnswers((current) => ({ ...current, [next.questionId]: next }));
  }

  /** What a field holds, for deciding whether Next is on. */
  const hasValue = (a: PlanAnswer) => {
    const custom = (a.custom ?? "").trim().length > 0;
    if (a.kind === "text") return true;
    if (a.kind === "multi") return (Array.isArray(a.value) && a.value.length > 0) || custom;
    return a.value !== null || custom;
  };
  const ready = hasValue(answer) && !busy;

  /** Tidies an answer before it is stored: empty text and empty ticks count as skipped. */
  function tidy(a: PlanAnswer): PlanAnswer {
    const custom = (a.custom ?? "").trim() || null;
    let value = a.value;
    if (typeof value === "string") value = value.trim() || null;
    if (Array.isArray(value) && value.length === 0) value = null;
    return { ...a, value, custom };
  }

  function queueSave(map: Record<string, PlanAnswer>, done: boolean): Promise<string | null> {
    const run = queue.current.then(() => onSave(ordered(map), done));
    queue.current = run.catch(() => null);
    return run;
  }

  async function advance(skip: boolean) {
    clearTimer();
    const current = skip ? emptyAnswer(q) : tidy(answers[q.id] ?? emptyAnswer(q));
    const map = { ...answers, [q.id]: current };
    setAnswers(map);
    setError(null);
    if (!last) {
      void queueSave(map, false).then((problem) => problem && setError(problem));
      setIndex(index + 1);
      return;
    }
    setBusy(true);
    const problem = await queueSave(map, true);
    if (problem) {
      setError(problem);
      setBusy(false);
      return;
    }
    onFinished();
  }

  function back() {
    clearTimer();
    setError(null);
    if (index === 0) onBack();
    else setIndex(index - 1);
  }

  // A fresh question starts at the top with the first choice reachable by number key.
  useEffect(() => {
    if (showCustom) customInput.current?.focus();
  }, [showCustom, index]);

  function pickSingle(option: string) {
    setCustomOpen((open) => ({ ...open, [q.id]: false }));
    const next: PlanAnswer = { ...answer, value: option, custom: null };
    update(next);
    // A single choice moves on by itself.
    const map = { ...answers, [q.id]: next };
    timer.current = window.setTimeout(() => {
      timer.current = null;
      setAnswers(map);
      setError(null);
      if (!last) {
        void queueSave(map, false).then((problem) => problem && setError(problem));
        setIndex((i) => i + 1);
      } else {
        setBusy(true);
        void queueSave(map, true).then((problem) => {
          if (problem) {
            setError(problem);
            setBusy(false);
          } else onFinished();
        });
      }
    }, AUTO_ADVANCE_MS);
  }

  function toggleMulti(option: string) {
    const current = Array.isArray(answer.value) ? answer.value : [];
    const value = current.includes(option)
      ? current.filter((x) => x !== option)
      : [...current, option];
    update({ ...answer, value });
  }

  function pick(n: number) {
    if (q.kind === "single" && q.options[n - 1]) pickSingle(q.options[n - 1]);
    else if (q.kind === "multi" && q.options[n - 1]) toggleMulti(q.options[n - 1]);
    else if (q.kind === "scale" && n >= 1 && n <= 5) update({ ...answer, value: n, custom: null });
  }

  // Latest handlers for the key listener without re-subscribing on every render.
  const handlers = useRef<{
    advance: typeof advance;
    back: typeof back;
    pick: typeof pick;
  } | null>(null);
  useEffect(() => {
    handlers.current = { advance, back, pick };
  });

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (document.querySelector("[role=dialog]")) return;
      const typing = isTyping(event.target);
      if (event.key === "Escape") {
        event.preventDefault();
        handlers.current?.back();
      } else if (event.key === "Backspace") {
        const value =
          event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement
            ? event.target.value
            : "";
        if (!typing || value === "") {
          event.preventDefault();
          handlers.current?.back();
        }
      } else if (event.key === "Enter") {
        if (event.target instanceof HTMLTextAreaElement || isPressable(event.target)) return;
        event.preventDefault();
        void handlers.current?.advance(false);
      } else if (!typing && /^[1-9]$/.test(event.key)) {
        event.preventDefault();
        handlers.current?.pick(Number(event.key));
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  function openCustom() {
    clearTimer();
    setCustomOpen((open) => ({ ...open, [q.id]: true }));
    // Typing your own replaces a single choice or a scale pick; ticks stay beside it.
    update({
      ...answer,
      value: q.kind === "multi" ? answer.value : null,
      custom: answer.custom ?? "",
    });
  }

  /** Leaving the box empty folds it back into the "Type my own" row. */
  function closeCustom() {
    if (speak.state !== "idle") return;
    setCustomOpen((open) => ({ ...open, [q.id]: false }));
    update({ ...answer, custom: null });
  }

  const screen =
    round === "main"
      ? ({ name: "questions", index, total } as const)
      : ({ name: "followups", index, total } as const);
  const ticked = Array.isArray(answer.value) ? answer.value : [];
  const scaleLow = q.scaleLabels?.low || "Low";
  const scaleHigh = q.scaleLabels?.high || "High";
  const hint =
    q.kind === "single"
      ? "Pick one."
      : q.kind === "multi"
        ? "Pick any that fit."
        : q.kind === "scale"
          ? "A rough guess is fine."
          : "Optional. A sentence or two is plenty.";

  return (
    <FlowFrame
      progress={stepProgress(screen)}
      eyebrow={stepEyebrow(screen)}
      onClose={onClose}
      closeLabel="Close, your answers are saved"
      busy={busy}
      right={
        <button
          type="button"
          onClick={() => void advance(true)}
          disabled={busy}
          className="h-11 rounded-full px-3 text-sm font-semibold text-dash-ink outline-none hover:bg-dash-well focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
        >
          Skip
        </button>
      }
      footer={
        <>
          <button type="button" onClick={back} className={flowButton("secondary")}>
            <ArrowLeft aria-hidden className="size-[18px]" />
            Back
          </button>
          <button
            type="button"
            disabled={!ready}
            onClick={() => void advance(false)}
            className={cn(flowButton(), "flex-1")}
          >
            {busy ? <Loader2 aria-hidden className="size-[18px] animate-spin" /> : null}
            Next
            {busy ? null : <ArrowRight aria-hidden className="size-[18px]" />}
          </button>
        </>
      }
    >
      {q.because ? (
        <span className="mt-3 inline-flex h-7 w-fit items-center gap-1.5 rounded-full bg-dash-well px-2.5 text-xs font-medium text-dash-ink-soft">
          <CornerDownRight aria-hidden className="size-3.5" />
          {q.because}
        </span>
      ) : null}
      <div
        key={q.id}
        className="flex flex-col gap-3.5 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200"
      >
        <StepTitle id="plan-question">
          {q.kind === "text" ? <label htmlFor="plan-text-answer">{q.text}</label> : q.text}
        </StepTitle>
        <StepHint>
          {hint}
          {q.kind === "multi" && ticked.length > 0 ? (
            <span className="ml-2 font-mono text-xs"> {ticked.length} picked</span>
          ) : null}
        </StepHint>

        {q.kind === "single" ? (
          <div
            role="radiogroup"
            aria-labelledby="plan-question"
            className="mt-1.5 flex flex-col gap-2"
          >
            {q.options.map((option, i) => {
              const on = answer.value === option;
              return (
                <button
                  key={option}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  aria-keyshortcuts={String(i + 1)}
                  onClick={() => pickSingle(option)}
                  className={optionClass(on)}
                >
                  {on ? (
                    <CircleCheck aria-hidden className="size-5 shrink-0" />
                  ) : (
                    <span
                      aria-hidden
                      className="size-5 shrink-0 rounded-full border-[1.5px] border-dash-ink-soft"
                    />
                  )}
                  <span className="flex-1 text-left">{option}</span>
                  <NumberKey n={i + 1} />
                </button>
              );
            })}
          </div>
        ) : null}

        {q.kind === "multi" ? (
          <div role="group" aria-labelledby="plan-question" className="mt-1.5 flex flex-col gap-2">
            {q.options.map((option, i) => {
              const on = ticked.includes(option);
              return (
                <button
                  key={option}
                  type="button"
                  role="checkbox"
                  aria-checked={on}
                  aria-keyshortcuts={String(i + 1)}
                  onClick={() => toggleMulti(option)}
                  className={cn(
                    optionClass(false),
                    on && "font-semibold shadow-[inset_0_0_0_2px_var(--dash-ink)]",
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      "grid size-5 shrink-0 place-items-center rounded-md",
                      on ? "bg-dash-ink text-dash-card" : "border-[1.5px] border-dash-ink-soft",
                    )}
                  >
                    {on ? <Check className="size-3.5" strokeWidth={3} /> : null}
                  </span>
                  <span className="flex-1 text-left">{option}</span>
                  <NumberKey n={i + 1} />
                </button>
              );
            })}
          </div>
        ) : null}

        {q.kind === "scale" ? (
          <>
            <div
              role="radiogroup"
              aria-labelledby="plan-question"
              className="mt-3 grid grid-cols-5 gap-2"
            >
              {[1, 2, 3, 4, 5].map((n) => {
                const on = answer.value === n;
                return (
                  <button
                    key={n}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    aria-label={
                      n === 1 ? `1, ${scaleLow}` : n === 5 ? `5, ${scaleHigh}` : String(n)
                    }
                    onClick={() => update({ ...answer, value: n, custom: null })}
                    className={cn(
                      "flex h-16 items-center justify-center rounded-2xl font-display text-2xl leading-none font-semibold outline-none transition-[background-color,transform] duration-150 ease-snap focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-[0.97] motion-reduce:transition-none",
                      on
                        ? "bg-dash-ink text-dash-card"
                        : "bg-dash-well text-dash-ink hover:bg-dash-edge",
                    )}
                  >
                    {n}
                  </button>
                );
              })}
            </div>
            <div
              aria-hidden
              className="flex justify-between text-xs font-medium text-dash-ink-soft"
            >
              <span>{scaleLow}</span>
              <span>{scaleHigh}</span>
            </div>
            {typeof answer.value === "number" ? (
              <div
                role="status"
                className="flex items-center gap-2 rounded-2xl bg-dash-well px-3.5 py-3 text-sm"
              >
                <span className="font-mono text-xs font-semibold">{answer.value} of 5</span>
                <span className="text-dash-ink-soft">
                  {answer.value === 1 ? scaleLow : answer.value === 5 ? scaleHigh : ""}
                </span>
              </div>
            ) : null}
          </>
        ) : null}

        {q.kind === "text" ? (
          <>
            <textarea
              id="plan-text-answer"
              autoFocus
              rows={5}
              maxLength={TEXT_MAX}
              value={typeof answer.value === "string" ? answer.value : ""}
              onChange={(e) => update({ ...answer, value: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault();
                  void advance(false);
                }
              }}
              className="mt-1.5 block min-h-[168px] w-full resize-none rounded-2xl bg-dash-well px-4 py-3.5 text-base leading-normal text-dash-ink outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            />
            <div className="flex items-center justify-between gap-3">
              {voice ? <MicButton speak={speak} withLabel /> : <span />}
              <span className="font-mono text-xs font-medium text-dash-ink-soft">
                {typeof answer.value === "string" ? answer.value.length : 0} / {TEXT_MAX}
              </span>
            </div>
            <VoiceNote speak={speak} />
          </>
        ) : showCustom ? (
          <div className="flex flex-col gap-1">
            <div className="flex w-full items-start gap-3 rounded-[14px] px-4 py-[15px] shadow-[inset_0_0_0_1.5px_var(--dash-ink)]">
              <Pencil aria-hidden className="mt-[3px] size-4 shrink-0 text-dash-ink-soft" />
              <GrowingText
                ref={customInput}
                value={answer.custom ?? ""}
                label="Your own answer"
                placeholder="Type my own"
                onChange={(custom) => update({ ...answer, custom })}
                onEnter={() => void advance(false)}
                onBlurEmpty={closeCustom}
                className="text-[15px] font-medium"
              />
              {voice ? <MicButton speak={speak} /> : null}
            </div>
            <VoiceNote speak={speak} />
            <span className="text-right font-mono text-xs text-dash-ink-soft">
              {(answer.custom ?? "").length} / {TEXT_MAX}
            </span>
          </div>
        ) : (
          <button
            type="button"
            aria-expanded={false}
            onClick={openCustom}
            className="flex min-h-14 w-full items-center gap-3 rounded-[14px] bg-transparent px-4 text-[15px] font-medium text-dash-ink-soft shadow-[inset_0_0_0_1px_var(--dash-edge)] outline-none transition-colors hover:bg-dash-well focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <Pencil aria-hidden className="size-4 shrink-0" />
            <span className="flex-1 text-left">Type my own</span>
            {voice ? <Mic aria-hidden className="size-4 shrink-0" /> : null}
          </button>
        )}
      </div>
      {error ? (
        <p role="alert" className="text-[13px] font-medium text-dash-bad">
          {error}
        </p>
      ) : null}
    </FlowFrame>
  );
}

function optionClass(on: boolean) {
  return cn(
    "flex min-h-14 w-full items-center gap-3 rounded-[14px] px-4 text-[15px] font-medium outline-none transition-[background-color,transform] duration-150 ease-snap focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-[0.99] motion-reduce:transition-none",
    on
      ? "bg-dash-ink font-semibold text-dash-card"
      : "bg-dash-well text-dash-ink hover:bg-dash-edge",
  );
}

/**
 * A text box that grows downwards as you type, instead of scrolling sideways. Enter moves on
 * (Shift+Enter adds a line); leaving it empty calls `onBlurEmpty`.
 */
function GrowingText({
  ref,
  value,
  label,
  placeholder,
  onChange,
  onEnter,
  onBlurEmpty,
  className,
}: {
  ref: React.RefObject<HTMLTextAreaElement | null>;
  value: string;
  label: string;
  placeholder: string;
  onChange: (value: string) => void;
  onEnter: () => void;
  onBlurEmpty: () => void;
  className?: string;
}) {
  useLayoutEffect(() => {
    const box = ref.current;
    if (!box) return;
    box.style.height = "auto";
    box.style.height = `${box.scrollHeight}px`;
  }, [ref, value]);
  return (
    <textarea
      ref={ref}
      rows={1}
      value={value}
      maxLength={TEXT_MAX}
      aria-label={label}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          onEnter();
        }
      }}
      onBlur={() => {
        if (!value.trim()) onBlurEmpty();
      }}
      className={cn(
        "block min-h-6 w-full flex-1 resize-none overflow-hidden bg-transparent leading-6 text-dash-ink outline-none placeholder:text-dash-ink-soft",
        className,
      )}
    />
  );
}

type Speak = ReturnType<typeof useGoalVoice>;

/** Tap to speak, tap again to finish; the words are added to the answer. */
function MicButton({ speak, withLabel = false }: { speak: Speak; withLabel?: boolean }) {
  const listening = speak.state === "listening";
  const working = speak.state === "working";
  const label = listening ? "Tap to finish" : working ? "Listening back…" : "Speak it";
  return (
    <button
      type="button"
      // Keep the box open: pressing the microphone must not count as leaving it empty.
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => void speak.toggle()}
      disabled={working}
      aria-pressed={listening}
      aria-label={withLabel ? undefined : listening ? "Finish speaking" : "Speak your answer"}
      className={cn(
        "inline-flex shrink-0 items-center justify-center gap-2 rounded-full text-sm font-medium outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-60",
        withLabel ? "h-11 px-4" : "-my-2.5 -mr-1.5 size-11",
        listening
          ? "bg-dash-ink text-dash-card"
          : withLabel
            ? "bg-dash-well text-dash-ink hover:bg-dash-edge"
            : "text-dash-ink-soft hover:bg-dash-well hover:text-dash-ink",
      )}
    >
      {working ? (
        <Loader2 aria-hidden className="size-4 animate-spin" />
      ) : listening ? (
        <Square aria-hidden className="size-3.5 fill-current" />
      ) : (
        <Mic aria-hidden className="size-4" />
      )}
      {withLabel ? label : null}
    </button>
  );
}

function VoiceNote({ speak }: { speak: Speak }) {
  if (!speak.message && !speak.tooLong) return null;
  return (
    <p role="status" className="text-[13px] text-dash-ink-soft">
      {speak.message ?? "That was the longest clip Ledge can take, so it stopped listening."}
    </p>
  );
}

/** The number key that picks this choice; shown with a mouse and keyboard only. */
function NumberKey({ n }: { n: number }) {
  return (
    <kbd
      aria-hidden
      className="hidden rounded-md bg-black/5 px-1.5 py-0.5 font-mono text-[11px] font-medium opacity-60 md:inline dark:bg-white/10"
    >
      {n}
    </kbd>
  );
}
