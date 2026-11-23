"use client";

import { Check, X } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { dashButton } from "@/components/dash/dash-button";
import { cn } from "@/lib/utils";

/**
 * The frame every step of making a plan sits in (screens 8c to 8g): a thin progress bar, a header
 * with Close, a mono eyebrow and an optional action, then the step and its buttons. One centred
 * column, so desktop reads like the phone frames.
 */
export function FlowFrame({
  progress,
  progressLabel = "New plan progress",
  eyebrow,
  onClose,
  closeLabel = "Close",
  right,
  children,
  footer,
  busy,
}: {
  /** 0 to 100; null hides the bar. */
  progress: number | null;
  progressLabel?: string;
  eyebrow: string;
  onClose: () => void;
  closeLabel?: string;
  right?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  busy?: boolean;
}) {
  return (
    <div
      aria-busy={busy || undefined}
      className="dash mx-auto flex min-h-[calc(100dvh-9rem)] w-full max-w-xl flex-col gap-3.5 md:min-h-[calc(100dvh-8rem)]"
    >
      {progress !== null ? (
        <div
          role="progressbar"
          aria-label={progressLabel}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
          className="h-1 w-full overflow-hidden rounded-full bg-dash-track"
        >
          <div
            className="h-full rounded-full bg-dash-accent transition-[width] duration-300 ease-snap motion-reduce:transition-none"
            style={{ width: `${progress}%` }}
          />
        </div>
      ) : null}
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          aria-label={closeLabel}
          onClick={onClose}
          className="grid size-11 shrink-0 place-items-center rounded-full border border-dash-edge bg-dash-card text-dash-ink outline-none transition-colors hover:bg-dash-well focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <X aria-hidden className="size-[18px]" />
        </button>
        <span className="font-mono text-xs font-medium text-dash-ink-soft">{eyebrow}</span>
        <div className="flex min-w-11 justify-end">{right}</div>
      </div>
      <div className="flex flex-1 flex-col gap-3.5">{children}</div>
      {footer ? <div className="mt-auto flex gap-2 pt-6">{footer}</div> : null}
    </div>
  );
}

/** The big question or step title. */
export function StepTitle({ children, id }: { children: ReactNode; id?: string }) {
  return (
    <h1
      id={id}
      className="mt-3 font-display text-[28px] leading-[1.15] font-semibold text-dash-ink md:text-[34px]"
    >
      {children}
    </h1>
  );
}

export function StepHint({ children }: { children: ReactNode }) {
  return <p className="text-[15px] leading-normal text-dash-ink-soft">{children}</p>;
}

/** A pill choice (screen 8d). On: ink fill with a tick, so it is never colour alone. */
export function Chip({
  on,
  children,
  className,
  ...props
}: { on?: boolean } & Omit<ComponentProps<"button">, "children"> & { children: ReactNode }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={on ?? false}
      className={cn(
        "inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full px-4 text-sm font-medium whitespace-nowrap outline-none transition-[background-color,color,transform] duration-150 ease-snap focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-[0.97] motion-reduce:transition-none",
        on
          ? "bg-dash-ink font-semibold text-dash-card"
          : "bg-dash-well text-dash-ink hover:bg-dash-edge",
        className,
      )}
      {...props}
    >
      {on ? <Check aria-hidden className="size-3.5" strokeWidth={2.75} /> : null}
      {children}
    </button>
  );
}

/** The large pill buttons of the steps: Next, Back, Add plan. */
export const flowButton = (variant: "primary" | "secondary" | "well" | "ghost" = "primary") =>
  cn(dashButton({ variant }), "h-12 px-6 text-[15px] font-semibold md:h-12");
