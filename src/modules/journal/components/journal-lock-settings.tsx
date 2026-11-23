"use client";

import { ArrowRight, EyeOff, Info, KeyRound } from "lucide-react";
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
import {
  ChoiceRow,
  GroupLabel,
  Notice,
  pill,
  RowIcon,
  settingsCard,
  Sub,
  Switch,
} from "@/modules/account/components/ui";

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

export function JournalLockSettings({
  on,
  pinLength,
  relock,
  hasPassword,
}: {
  on: boolean;
  pinLength: 4 | 6;
  relock: JournalRelock;
  /** Accounts made with Google set a password first: it is the way back in after a forgotten PIN. */
  hasPassword: boolean;
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
    <div className="flex flex-col gap-3">
      {!hasPassword && !on ? (
        <Notice icon={<Info aria-hidden />}>
          You signed up with Google, so this account has no password yet. The lock needs one in case
          you forget the PIN.
          <Link
            href="/settings/security"
            className="mt-2 flex min-h-8 w-fit items-center gap-1 font-semibold text-dash-ink outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            Set a password
            <ArrowRight aria-hidden className="size-3.5" />
          </Link>
        </Notice>
      ) : null}

      <section aria-label="Lock" className={settingsCard}>
        <div className="flex items-start gap-3 p-4">
          <span className="min-w-0 flex-1">
            <span id="lock-switch-label" className="block text-[15px] font-semibold">
              Lock the Journal
            </span>
            <Sub className="mt-0.5">
              {hasPassword || on
                ? "A PIN guards the Journal only. Tasks and money stay open."
                : "Available once a password is set."}
            </Sub>
          </span>
          <Switch
            on={on}
            labelledBy="lock-switch-label"
            disabled={!on && !hasPassword}
            onChange={() =>
              on ? setStep({ purpose: "off", step: "current" }) : router.push("/journal?lock=setup")
            }
          />
        </div>
        {on ? (
          <div className="flex min-h-14 items-center gap-3 border-t border-dash-edge px-4 py-2.5">
            <RowIcon>
              <KeyRound />
            </RowIcon>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-medium">PIN</span>
              <span className="block font-mono text-[12px] font-medium text-dash-ink-soft">
                {pinLength} digits
              </span>
            </span>
            <button
              type="button"
              onClick={() => setStep({ purpose: "change", step: "current" })}
              className={pill.small}
            >
              Change PIN
            </button>
          </div>
        ) : null}
      </section>

      {on ? (
        <>
          <GroupLabel id="relock-title">Lock again</GroupLabel>
          <div role="radiogroup" aria-labelledby="relock-title" className={settingsCard}>
            {RELOCK.map((option) => (
              <ChoiceRow
                key={option.value}
                checked={choice === option.value}
                onSelect={() => choose(option.value)}
              >
                {option.label}
              </ChoiceRow>
            ))}
          </div>

          <GroupLabel>If you forget the PIN</GroupLabel>
          <div className={cn(settingsCard, "p-4")}>
            <span className="block text-[15px] font-medium">Unlock with my account password</span>
            <Sub className="mt-0.5">
              Then choose a new PIN. This always works, so a forgotten PIN never locks you out.
            </Sub>
          </div>
        </>
      ) : null}

      <p className="flex gap-2.5 rounded-2xl bg-dash-well px-4 py-3 text-[13px] text-dash-ink-soft">
        <EyeOff aria-hidden className="mt-0.5 size-4 shrink-0" />
        While the Journal is locked, Home shows only whether you&apos;ve written, never the words.
        Data exports still include journal pages.
      </p>

      <PinSheet step={step} pinLength={pinLength} onStep={setStep} onClose={() => setStep(null)} />
    </div>
  );
}
