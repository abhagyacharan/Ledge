"use client";

import { Check, ChevronLeft, ChevronRight, EyeOff, Lock, LockOpen } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Sheet, SheetBody, SheetHeader } from "@/components/dash/sheet";
import { cn } from "@/lib/utils";
import { run } from "@/modules/todos/components/run-action";
import type { JournalRelock } from "@/server/db/schema";
import {
  changeJournalPinAction,
  setJournalRelockAction,
  turnOffJournalLockAction,
} from "../lock-actions";
import { PinPad } from "./pin-pad";

/**
 * Journal lock settings (docs/new_design.md screen 7f): the lock on or off, Change PIN, and when
 * it locks again. Turning it off or changing the PIN asks for the current PIN first; turning it
 * on goes to the Journal to choose one (screen 7a).
 */

const RELOCK: { value: JournalRelock; label: string }[] = [
  { value: "leave", label: "When I leave the Journal" },
  { value: "1m", label: "After 1 minute away" },
  { value: "5m", label: "After 5 minutes away" },
  { value: "close", label: "When I close Ledge" },
];

type Step =
  | { purpose: "off"; step: "current" }
  | { purpose: "change"; step: "current" }
  | { purpose: "change"; step: "new"; current: string; length: 4 | 6 }
  | { purpose: "change"; step: "confirm"; current: string; length: 4 | 6; first: string };

function PinSheet({
  step,
  pinLength,
  onStep,
  onClose,
}: {
  step: Step | null;
  pinLength: 4 | 6;
  onStep: (next: Step | null) => void;
  onClose: () => void;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [errorKey, setErrorKey] = useState(0);
  const [pending, startTransition] = useTransition();
  const fail = (message: string) => {
    setError(message);
    setErrorKey((k) => k + 1);
  };

  function onPin(pin: string) {
    if (!step) return;
    if (step.purpose === "off") {
      startTransition(async () => {
        const result = await turnOffJournalLockAction({ currentPin: pin });
        if (!result.ok) return fail(result.error);
        toast.success("Journal lock is off.");
        onStep(null);
        router.refresh();
      });
      return;
    }
    if (step.step === "current") {
      setError(null);
      onStep({ purpose: "change", step: "new", current: pin, length: pinLength });
    } else if (step.step === "new") {
      setError(null);
      onStep({ ...step, step: "confirm", first: pin });
    } else {
      startTransition(async () => {
        const result = await changeJournalPinAction({
          currentPin: step.current,
          pin: step.first,
          confirm: pin,
        });
        if (!result.ok) {
          // A wrong current PIN starts over; a mismatch goes back to choosing.
          onStep(
            result.fieldErrors?.currentPin
              ? { purpose: "change", step: "current" }
              : { purpose: "change", step: "new", current: step.current, length: step.length },
          );
          return fail(result.fieldErrors?.confirm ?? result.error);
        }
        toast.success("PIN changed. Use the new one next time.");
        onStep(null);
        router.refresh();
      });
    }
  }

  const title = !step
    ? ""
    : step.step === "current"
      ? "Enter your current PIN"
      : step.step === "new"
        ? "Choose a new PIN"
        : "Type it again";
  const length = step && step.step !== "current" ? step.length : pinLength;

  return (
    <Sheet
      open={step !== null}
      onOpenChange={(next) => {
        if (!next) {
          setError(null);
          onClose();
        }
      }}
    >
      <SheetHeader
        title={title}
        description={
          step?.purpose === "off" ? "The lock turns off once your PIN is right." : undefined
        }
      />
      <SheetBody className="flex flex-col items-center pb-8">
        {step ? (
          <PinPad
            key={`${step.purpose}-${step.step}-${length}`}
            length={length}
            onComplete={onPin}
            error={error ? `${error}#${errorKey}` : null}
            busy={pending}
            label={title}
          />
        ) : null}
        <p
          role="alert"
          className={cn(
            "mt-5 inline-flex min-h-8 items-center rounded-full px-3 text-[13px] font-medium",
            error ? "bg-dash-bad-bg text-dash-bad" : "invisible",
          )}
        >
          {error ?? "."}
        </p>
        {step?.step === "new" ? (
          <button
            type="button"
            onClick={() => onStep({ ...step, length: step.length === 4 ? 6 : 4 })}
            className="min-h-11 text-[14px] font-semibold outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            Use a {step.length === 4 ? 6 : 4}-digit PIN
          </button>
        ) : null}
      </SheetBody>
    </Sheet>
  );
}

const cardClass =
  "rounded-3xl border border-dash-edge bg-dash-card px-4 shadow-(--dash-card-shadow)";

export function JournalLockSettings({
  on,
  pinLength,
  relock,
}: {
  on: boolean;
  pinLength: 4 | 6;
  relock: JournalRelock;
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step | null>(null);
  const [choice, setChoice] = useState(relock);
  const [, startTransition] = useTransition();

  function choose(next: JournalRelock) {
    const before = choice;
    setChoice(next);
    startTransition(async () => {
      const result = await run(setJournalRelockAction({ relock: next }));
      if (!result.ok) setChoice(before);
    });
  }

  return (
    <div className="dash mx-auto w-full max-w-[560px] pb-24">
      <Link
        href="/settings"
        className="inline-flex min-h-11 items-center gap-1 text-[14px] text-dash-ink-soft outline-none hover:text-dash-ink focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <ChevronLeft aria-hidden className="size-4" />
        Settings
      </Link>
      <h1 className="mt-1 mb-5 font-display text-[32px] leading-tight font-semibold">
        Journal lock
      </h1>

      <section className={cardClass} aria-label="Lock">
        <div className="flex min-h-15 items-center gap-3">
          <Lock aria-hidden className="size-4 shrink-0" />
          <span id="lock-switch-label" className="flex-1 text-[15px] font-semibold">
            Lock Journal with a PIN
          </span>
          <span className="text-[13px] text-dash-ink-soft" aria-hidden>
            {on ? "On" : "Off"}
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={on}
            aria-labelledby="lock-switch-label"
            onClick={() =>
              on ? setStep({ purpose: "off", step: "current" }) : router.push("/journal?lock=setup")
            }
            className={cn(
              "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full p-0.5 outline-none transition-colors duration-150 focus-visible:ring-3 focus-visible:ring-ring/50",
              on ? "bg-dash-ink" : "bg-dash-track",
            )}
          >
            <span
              aria-hidden
              className={cn(
                "size-6 rounded-full bg-dash-card shadow-(--dash-lift) transition-transform duration-150 ease-snap",
                on && "translate-x-5",
              )}
            />
          </button>
        </div>
        {on ? (
          <button
            type="button"
            onClick={() => setStep({ purpose: "change", step: "current" })}
            className="flex min-h-13 w-full items-center border-t border-dash-edge pl-7 text-left text-[14px] outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <span className="flex-1">Change PIN</span>
            <ChevronRight aria-hidden className="size-4 text-dash-ink-soft" />
          </button>
        ) : null}
      </section>

      <section className={cn(cardClass, "mt-3 py-2", !on && "opacity-60")}>
        <h2 id="relock-title" className="pt-2 pb-1 text-[12px] font-medium text-dash-ink-soft">
          Lock again
        </h2>
        <div role="radiogroup" aria-labelledby="relock-title">
          {RELOCK.map((option) => {
            const checked = choice === option.value;
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={checked}
                disabled={!on}
                onClick={() => choose(option.value)}
                className="flex min-h-13 w-full items-center border-t border-dash-edge text-left text-[14px] outline-none first:border-t-0 focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-default"
              >
                <span className={cn("flex-1", checked && "font-semibold")}>{option.label}</span>
                {checked ? (
                  <span className="grid size-6 place-items-center rounded-full bg-dash-ink text-dash-card">
                    <Check aria-hidden className="size-3.5" strokeWidth={3} />
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </section>

      <p className="mt-3 flex gap-2.5 rounded-2xl bg-dash-well px-4 py-3 text-[13px] text-dash-ink-soft">
        <EyeOff aria-hidden className="mt-0.5 size-4 shrink-0" />
        While the Journal is locked, Home shows only whether you&apos;ve written, never the words.
        Data exports still include journal pages.
      </p>

      {on ? (
        <button
          type="button"
          onClick={() => setStep({ purpose: "off", step: "current" })}
          className="mt-5 inline-flex min-h-11 items-center gap-1.5 text-[14px] font-semibold text-dash-bad outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <LockOpen aria-hidden className="size-4" />
          Turn off the lock
        </button>
      ) : null}

      <PinSheet step={step} pinLength={pinLength} onStep={setStep} onClose={() => setStep(null)} />
    </div>
  );
}
