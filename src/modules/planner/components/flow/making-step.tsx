"use client";

import { CircleAlert, RotateCcw } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Result } from "@/lib/result";
import { cn } from "@/lib/utils";
import { FlowFrame, flowButton } from "./flow-frame";
import { stepProgress } from "./progress";

/** After this long without an answer the screen gives up and offers Try again. */
export const MAKE_TIMEOUT_MS = 30_000;
const TIMEOUT_REASON = "The planner didn't answer in time. This usually clears up in a minute.";

export type MakeStatus = "making" | "error";

/**
 * Runs `run` once on mount (and again on Try again), with a 30 second limit. Calls `onDone` with
 * the data when it works; otherwise gives the reason. A late answer after the limit is ignored.
 */
export function useMake<T>(run: () => Promise<Result<T>>, onDone: (data: T) => void) {
  const [status, setStatus] = useState<MakeStatus>("making");
  const [reason, setReason] = useState("");
  const started = useRef(false);
  const token = useRef(0);
  const latest = useRef({ run, onDone });
  useEffect(() => {
    latest.current = { run, onDone };
  });

  const start = useCallback(() => {
    const mine = ++token.current;
    setStatus("making");
    const timeout = new Promise<"timeout">((resolve) =>
      window.setTimeout(() => resolve("timeout"), MAKE_TIMEOUT_MS),
    );
    Promise.race([latest.current.run(), timeout])
      .then((outcome) => {
        if (mine !== token.current) return;
        if (outcome === "timeout") {
          token.current += 1;
          setReason(TIMEOUT_REASON);
          setStatus("error");
        } else if (outcome.ok) {
          latest.current.onDone(outcome.data);
        } else {
          setReason(outcome.error);
          setStatus("error");
        }
      })
      .catch(() => {
        if (mine !== token.current) return;
        setReason("Couldn't reach the server. Check your connection and try again.");
        setStatus("error");
      });
  }, []);

  useEffect(() => {
    // React runs effects twice in development; one request is enough.
    if (started.current) return;
    started.current = true;
    start();
  }, [start]);

  return { status, reason, retry: start };
}

const sk = "dash-skeleton";

/** Placeholder at the review's real sizes (screen 8g), so nothing jumps when the plan lands. */
export function ReviewSkeleton({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("flex flex-1 flex-col gap-3", className)}>
      <span className={cn(sk, "mt-1 h-[30px] w-3/5")} />
      <span className={cn(sk, "h-3.5 w-11/12")} />
      <div className="flex gap-1.5">
        <span className={cn(sk, "h-11 w-36 rounded-full")} />
        <span className={cn(sk, "h-11 w-32 rounded-full")} />
        <span className={cn(sk, "h-11 w-16 rounded-full")} />
      </div>
      <div className="flex min-h-[300px] flex-1 flex-col gap-3 rounded-3xl border border-dash-edge bg-dash-card p-5">
        <span className={cn(sk, "h-3 w-2/5")} />
        <span className={cn(sk, "h-[26px] w-4/5")} />
        <span className={cn(sk, "h-[26px] w-1/2")} />
        <div className="flex gap-2.5">
          <span className={cn(sk, "h-3.5 w-20")} />
          <span className={cn(sk, "h-3.5 w-12")} />
          <span className={cn(sk, "h-3.5 w-24")} />
        </div>
        <span className={cn(sk, "h-3 w-full")} />
        <span className={cn(sk, "h-3 w-11/12")} />
        <span className={cn(sk, "h-3 w-3/5")} />
        <span className={cn(sk, "mt-2 h-4 w-3/4")} />
        <span className={cn(sk, "h-4 w-2/3")} />
      </div>
      <span className={cn(sk, "h-3 w-32 self-center")} />
      <div className="grid grid-cols-[1fr_1fr_1.3fr] gap-2">
        <span className={cn(sk, "h-12 rounded-full")} />
        <span className={cn(sk, "h-12 rounded-full")} />
        <span className={cn(sk, "h-12 rounded-full")} />
      </div>
    </div>
  );
}

/**
 * Making your plan (screen 8g): what is being shaped, skeleton cards, and, when it fails or takes
 * over 30 seconds, an error that keeps the answers with Try again and Save as draft.
 */
export function MakingStep({
  status,
  reason,
  heading,
  note = "Usually under 20 seconds. You can leave; it waits in Drafts.",
  eyebrow = "Making your plan",
  errorHeading = "Ledge couldn't make a plan right now. Your answers are kept.",
  onRetry,
  onSaveDraft,
  saveDraftLabel = "Save as draft",
  onClose,
}: {
  status: MakeStatus;
  reason: string;
  heading: string;
  note?: string;
  eyebrow?: string;
  errorHeading?: string;
  onRetry: () => void;
  onSaveDraft: () => void;
  saveDraftLabel?: string;
  onClose: () => void;
}) {
  if (status === "error") {
    return (
      <FlowFrame
        progress={null}
        eyebrow={eyebrow}
        onClose={onClose}
        closeLabel="Close, your answers are kept"
      >
        <div
          role="alert"
          className="my-auto flex flex-col items-center gap-2.5 rounded-3xl bg-dash-card px-6 py-7 text-center shadow-(--dash-card-shadow) ring-1 ring-dash-edge"
        >
          <span className="grid size-14 place-items-center rounded-full bg-dash-bad-bg text-dash-bad">
            <CircleAlert aria-hidden className="size-6" />
          </span>
          <div className="mt-1.5 font-display text-xl leading-snug font-semibold text-dash-ink">
            {errorHeading}
          </div>
          <div className="text-sm leading-normal text-dash-ink-soft">{reason}</div>
          <button type="button" onClick={onRetry} className={cn(flowButton(), "mt-2.5 w-full")}>
            <RotateCcw aria-hidden className="size-[17px]" />
            Try again
          </button>
          <button
            type="button"
            onClick={onSaveDraft}
            className={cn(flowButton("secondary"), "h-11 w-full text-sm md:h-11")}
          >
            {saveDraftLabel}
          </button>
        </div>
      </FlowFrame>
    );
  }
  return (
    <FlowFrame
      progress={stepProgress({ name: "making" })}
      eyebrow={eyebrow}
      onClose={onClose}
      closeLabel="Close, the plan keeps making in Drafts"
      busy
    >
      <p
        role="status"
        aria-live="polite"
        className="mt-3 font-display text-2xl leading-tight font-semibold text-dash-ink md:text-[28px]"
      >
        {heading}
      </p>
      <p className="text-sm leading-normal text-dash-ink-soft">{note}</p>
      <ReviewSkeleton />
    </FlowFrame>
  );
}
