"use client";

import { ArrowLeft, ArrowRight, Check, ChevronUp, Pencil, Plus, Scissors, X } from "lucide-react";
import {
  animate,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useTransform,
} from "motion/react";
import { useEffect, useImperativeHandle, useRef, useState, type Ref } from "react";
import { cn } from "@/lib/utils";
import type { DraftTask, PlanPhase } from "../../schema";
import type { FlowDates } from "../flow/types";
import { CardEditor } from "./card-editor";
import { isCut, phaseLabel, swipeCommit, swipeLean } from "./review-logic";
import { TaskCardBody } from "./task-card";

export type CardsHandle = { commit: (direction: "cut" | "keep") => void };

const FLY_MS = 0.2;
const EASE_SNAP = [0.23, 1, 0.32, 1] as const;

/**
 * The card-by-card review (screen 8h). One large card you can drag: past a third of its width it
 * commits, the word Cut or Keep shows from 40px and the matching button lights up. Cut, Edit and
 * Keep are buttons and keys too (the arrows, X, E), so the gesture is never the only way. With
 * reduced motion the card fades out instead of flying.
 */
export function CardsView({
  ref,
  tasks,
  index,
  phases,
  planStart,
  planEnd,
  dates,
  errors,
  editing,
  cutCount,
  focusToken,
  canAdd,
  onDecide,
  onEdit,
  onEditDone,
  onEditCancel,
  onOpenTray,
  onSkipToSummary,
  onAddTask,
}: {
  ref?: Ref<CardsHandle>;
  tasks: DraftTask[];
  index: number;
  phases: PlanPhase[];
  planStart: string;
  planEnd: string;
  dates: FlowDates;
  errors: Record<string, string>;
  editing: boolean;
  cutCount: number;
  focusToken: number;
  canAdd: boolean;
  onDecide: (direction: "cut" | "keep") => void;
  onEdit: () => void;
  onEditDone: (next: DraftTask) => void;
  onEditCancel: () => void;
  onOpenTray: () => void;
  onSkipToSummary: () => void;
  onAddTask: () => void;
}) {
  const reduce = useReducedMotion();
  const task = tasks[index];
  const next = tasks[index + 1];
  const cardRef = useRef<HTMLElement>(null);
  const x = useMotionValue(0);
  const opacity = useMotionValue(1);
  const rotate = useTransform(x, [-220, 0, 220], [-7, 0, 7]);
  const behindScale = useTransform(x, [-160, 0, 160], [1, 0.96, 1]);
  const [lean, setLean] = useState<"cut" | "keep" | null>(null);
  const [armed, setArmed] = useState(false);
  const flying = useRef(false);

  useMotionValueEvent(x, "change", (value) => {
    setLean(swipeLean(value));
    setArmed(swipeCommit(value, cardRef.current?.offsetWidth ?? 0) !== null);
  });

  async function commit(direction: "cut" | "keep") {
    if (flying.current || editing) return;
    flying.current = true;
    const width = cardRef.current?.offsetWidth ?? 360;
    if (reduce) {
      await animate(opacity, 0, { duration: 0.12 });
    } else {
      await animate(x, (direction === "cut" ? -1 : 1) * width * 1.3, {
        duration: FLY_MS,
        ease: EASE_SNAP,
      });
    }
    onDecide(direction);
    x.set(0);
    opacity.set(1);
    setLean(null);
    setArmed(false);
    flying.current = false;
  }

  useImperativeHandle(ref, () => ({ commit: (direction) => void commit(direction) }));

  // After a keyboard decision the new card gets focus, so the next key lands on it.
  useEffect(() => {
    if (focusToken > 0 && !editing) cardRef.current?.focus({ preventScroll: true });
  }, [focusToken, index, editing]);

  if (!task) return null;
  const total = tasks.length;
  const label = phases.find((p) => p.id === task.phaseId);
  const eyebrow = label ? phaseLabel(label, planStart, planEnd) : "";
  const cut = isCut(task);
  const status = lean
    ? armed
      ? `Let go to ${lean}`
      : `Drag further to ${lean}`
    : `Card ${index + 1} of ${total} · ${cutCount} cut`;

  return (
    <>
      <div className="relative flex min-h-[26rem] flex-1 flex-col">
        {next ? (
          <motion.div
            aria-hidden
            style={{ scale: behindScale }}
            className="absolute inset-x-3.5 top-3.5 -bottom-2 flex flex-col gap-2 overflow-hidden rounded-3xl bg-dash-card p-5 opacity-70 ring-1 ring-dash-edge"
          >
            <span className="font-mono text-xs text-dash-ink-soft">
              {phases.find((p) => p.id === next.phaseId)
                ? phaseLabel(
                    phases.find((p) => p.id === next.phaseId) as PlanPhase,
                    planStart,
                    planEnd,
                  )
                : ""}
            </span>
            <span className="font-display text-2xl leading-tight font-semibold text-dash-ink-soft">
              {next.title}
            </span>
          </motion.div>
        ) : (
          <div
            aria-hidden
            className="absolute inset-x-3.5 top-3.5 -bottom-2 rounded-3xl bg-dash-card opacity-70 ring-1 ring-dash-edge"
          />
        )}
        <motion.article
          ref={cardRef}
          key={`card-${index}`}
          tabIndex={0}
          aria-roledescription="card"
          aria-label={`Card ${index + 1} of ${total}: ${task.title}`}
          drag={editing ? false : "x"}
          dragElastic={0.9}
          dragMomentum={false}
          onDragEnd={() => {
            const direction = swipeCommit(x.get(), cardRef.current?.offsetWidth ?? 0);
            if (direction) void commit(direction);
            else animate(x, 0, { type: "spring", stiffness: 520, damping: 38 });
          }}
          style={{ x, rotate, opacity, transformOrigin: "50% 110%" }}
          className={cn(
            "relative flex flex-1 flex-col gap-3 rounded-3xl bg-dash-card p-5 outline-none ring-1 ring-dash-edge focus-visible:ring-2 focus-visible:ring-dash-accent",
            "shadow-[0_12px_28px_-16px_rgb(0_0_0/0.25)] dark:shadow-none",
            cut && "opacity-60",
          )}
        >
          <SwipeWord direction="cut" show={lean === "cut"} />
          <SwipeWord direction="keep" show={lean === "keep"} />
          {editing ? (
            <CardEditor
              task={task}
              phases={phases}
              planStart={planStart}
              planEnd={planEnd}
              dates={dates}
              problem={errors[task.key]}
              onDone={onEditDone}
              onCancel={onEditCancel}
            />
          ) : (
            <TaskCardBody
              task={task}
              dates={dates}
              problem={errors[task.key]}
              eyebrow={eyebrow}
              counter={`${index + 1} / ${total}`}
            />
          )}
        </motion.article>
      </div>

      <div
        aria-live="polite"
        className="mt-1.5 text-center font-mono text-xs font-medium text-dash-ink-soft"
      >
        {status}
        <span className="sr-only">
          . {task.title}
          {cut ? ", cut" : ""}
        </span>
      </div>

      <div className="grid grid-cols-[1fr_1fr_1.3fr] gap-2">
        <button
          type="button"
          aria-keyshortcuts="ArrowLeft X"
          disabled={editing}
          onClick={() => void commit("cut")}
          className={cn(
            "inline-flex h-12 items-center justify-center gap-2 rounded-full border border-dash-edge bg-dash-card px-3 text-[15px] font-semibold text-dash-ink outline-none transition-[box-shadow,background-color] hover:bg-dash-well focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50",
            lean === "cut" && "shadow-[inset_0_0_0_2px_var(--dash-ink)]",
          )}
        >
          <ArrowLeft aria-hidden className="size-[17px]" />
          Cut
        </button>
        <button
          type="button"
          aria-keyshortcuts="E"
          onClick={onEdit}
          disabled={editing}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-dash-edge bg-dash-card px-3 text-[15px] font-semibold text-dash-ink outline-none transition-colors hover:bg-dash-well focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
        >
          <Pencil aria-hidden className="size-4" />
          Edit
        </button>
        <button
          type="button"
          aria-keyshortcuts="ArrowRight"
          disabled={editing}
          onClick={() => void commit("keep")}
          className={cn(
            "inline-flex h-12 items-center justify-center gap-2 rounded-full bg-dash-ink px-3 text-[15px] font-semibold text-dash-card outline-none transition-[box-shadow,background-color] hover:bg-dash-ink/85 focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50",
            lean === "keep" && "shadow-[0_0_0_2px_var(--dash-card),0_0_0_4px_var(--dash-ink)]",
          )}
        >
          Keep
          <ArrowRight aria-hidden className="size-[17px]" />
        </button>
      </div>
      <p className="hidden text-center text-xs text-dash-ink-soft md:block">
        <kbd className="font-mono">←</kbd> or <kbd className="font-mono">X</kbd> cut ·{" "}
        <kbd className="font-mono">→</kbd> keep · <kbd className="font-mono">E</kbd> edit ·{" "}
        <kbd className="font-mono">Enter</kbd> open
      </p>

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            aria-label={`Cut cards, ${cutCount}. Open to bring one back`}
            onClick={onOpenTray}
            className="inline-flex h-11 items-center gap-1.5 rounded-full bg-dash-well px-4 text-sm font-medium text-dash-ink outline-none transition-colors hover:bg-dash-edge focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <Scissors aria-hidden className="size-[15px]" />
            Cut ({cutCount})
            <ChevronUp aria-hidden className="size-[15px]" />
          </button>
          {canAdd ? (
            <button
              type="button"
              onClick={onAddTask}
              className="inline-flex h-11 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-dash-ink-soft outline-none transition-colors hover:text-dash-ink focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <Plus aria-hidden className="size-4" />
              Add a task
            </button>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onSkipToSummary}
          className="h-11 rounded-full px-3 text-sm font-semibold text-dash-ink outline-none hover:bg-dash-well focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          Skip to summary
        </button>
      </div>
    </>
  );
}

/** The word that shows while dragging: Cut on the right, Keep on the left, as in the design. */
function SwipeWord({ direction, show }: { direction: "cut" | "keep"; show: boolean }) {
  const isCutWord = direction === "cut";
  return (
    <span
      aria-hidden
      className={cn(
        "pointer-events-none absolute top-[18px] z-10 inline-flex h-[38px] items-center gap-1.5 rounded-full px-3.5 text-base font-bold transition-opacity duration-100",
        isCutWord
          ? "right-[18px] rotate-[7deg] bg-dash-bad-bg text-dash-bad shadow-[inset_0_0_0_2px_var(--dash-bad)]"
          : "left-[18px] -rotate-[7deg] bg-dash-good-bg text-dash-good shadow-[inset_0_0_0_2px_var(--dash-good)]",
        show ? "opacity-100" : "opacity-0",
      )}
    >
      {isCutWord ? (
        <X className="size-[17px]" strokeWidth={2.75} />
      ) : (
        <Check className="size-[17px]" strokeWidth={2.75} />
      )}
      {isCutWord ? "Cut" : "Keep"}
    </span>
  );
}
