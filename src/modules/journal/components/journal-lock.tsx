"use client";

import { ArrowLeft, Lock, Timer } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { DashButton } from "@/components/dash/dash-button";
import { Sheet, SheetBody, SheetFooter, SheetHeader } from "@/components/dash/sheet";
import { cn } from "@/lib/utils";
import type { JournalRelock } from "@/server/db/schema";
import {
  checkPasswordAction,
  lockJournalAction,
  resetJournalPinAction,
  turnOnJournalLockAction,
  unlockJournalAction,
  unlockWithPasswordAction,
} from "../lock-actions";
import { PinPad } from "./pin-pad";

/**
 * The journal lock on screen (docs/journal-spec.md, "Journal lock"; docs/new_design.md screens
 * 7a to 7e, 7h).
 *
 * - `JournalLockScreen`: choose a PIN (7a), locked (7b, 7h), wrong PIN (7c), paused (7d), and
 *   the password sheet for a forgotten PIN or a way in (7e).
 * - `JournalPrivate`: wraps the open journal; hidden at once when the page is hidden.
 * - `JournalAutoLock`: mounted app-wide; locks again by the "Lock again" choice.
 *
 * The `data-journal-locked` mark on <html> hides journal content with CSS until the next unlock,
 * so the phone's app switcher and the browser's back/forward memory never show it.
 */

const LOCK_MARK = "journalLocked";
const AWAY_KEY = "ledge:journal-away-since";

export function markJournalLocked() {
  document.documentElement.dataset[LOCK_MARK] = "1";
}
function clearLocked() {
  delete document.documentElement.dataset[LOCK_MARK];
  try {
    sessionStorage.removeItem(AWAY_KEY);
  } catch {
    // Blocked storage only loses the timed "Lock again" memory.
  }
}
const isMarkedLocked = () => document.documentElement.dataset[LOCK_MARK] === "1";

/** Lock right now: hide, tell the server, and show the PIN screen. */
export async function lockJournalNow(refresh: () => void) {
  markJournalLocked();
  await lockJournalAction({});
  refresh();
}

// ---------------------------------------------------------------------------------------------
// Locking again by the user's choice (screen 7f, "Lock again").

const THRESHOLD_MS: Record<JournalRelock, number> = {
  leave: 0,
  "1m": 60_000,
  "5m": 5 * 60_000,
  close: Number.POSITIVE_INFINITY,
};

function readAway(): number | null {
  try {
    const value = Number(sessionStorage.getItem(AWAY_KEY));
    return Number.isFinite(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
}
function writeAway(time: number) {
  try {
    if (!readAway()) sessionStorage.setItem(AWAY_KEY, String(time));
  } catch {
    // See clearLocked.
  }
}

function goAway(relock: JournalRelock) {
  writeAway(Date.now());
  if (relock !== "close") markJournalLocked();
  if (relock === "leave") navigator.sendBeacon?.("/api/journal/lock");
}

/**
 * App-wide. "Away" starts when the app or tab is hidden, or when you leave the Journal. On the
 * way back (the tab shown again, or the Journal opened), it locks if you were away at least as
 * long as the chosen time. Closing Ledge always locks.
 */
export function JournalAutoLock({ on, relock }: { on: boolean; relock: JournalRelock }) {
  const pathname = usePathname();
  const inJournal = pathname === "/journal" || pathname.startsWith("/journal/");
  const wasInJournal = useRef(inJournal);

  useEffect(() => {
    if (!on) return;
    function onVisibility() {
      if (document.visibilityState === "hidden") goAway(relock);
    }
    function onPageHide() {
      markJournalLocked();
      navigator.sendBeacon?.("/api/journal/lock");
    }
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, [on, relock]);

  // Leaving the Journal for another page in the app is "away" too.
  useEffect(() => {
    if (on && wasInJournal.current && !inJournal) goAway(relock);
    wasInJournal.current = inJournal;
  }, [inJournal, on, relock]);

  return null;
}

/** The open journal. On mount and when shown again, it decides whether being away locks it. */
export function JournalPrivate({
  relock,
  children,
}: {
  /** Null when the lock is off. */
  relock: JournalRelock | null;
  children: ReactNode;
}) {
  const router = useRouter();
  const busy = useRef(false);

  useEffect(() => {
    async function decide() {
      if (busy.current || document.visibilityState !== "visible") return;
      if (!relock) {
        clearLocked();
        return;
      }
      const since = readAway();
      const long = since !== null && Date.now() - since >= THRESHOLD_MS[relock];
      if (long || (relock === "leave" && isMarkedLocked())) {
        busy.current = true;
        await lockJournalNow(() => router.refresh());
        busy.current = false;
        return;
      }
      // Back soon enough: show it again.
      clearLocked();
    }
    void decide();
    const onVisibility = () => void decide();
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [relock, router]);

  return <div data-journal-private>{children}</div>;
}

// ---------------------------------------------------------------------------------------------
// The screens.

type Screen =
  | { name: "choose"; step: 1 | 2; length: 4 | 6; first?: string; resetPassword?: string }
  | { name: "locked" }
  | { name: "paused"; until: number };

/** On phones the lock screen takes the whole screen: no tab bar or + (screen 7b). */
function useFullScreenOnPhone() {
  useEffect(() => {
    document.documentElement.dataset.pinScreen = "1";
    return () => {
      delete document.documentElement.dataset.pinScreen;
    };
  }, []);
}

function Countdown({
  until,
  onDone,
  locale,
}: {
  until: number;
  onDone: () => void;
  locale: string;
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const left = Math.max(0, until - now);
  useEffect(() => {
    if (left === 0) onDone();
  }, [left, onDone]);
  const minutes = Math.floor(left / 60_000);
  const seconds = Math.floor((left % 60_000) / 1000);
  const at = new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit" }).format(until);
  return (
    <p className="flex flex-wrap items-baseline gap-x-2">
      <span className="font-display text-5xl font-semibold tabular-nums" role="timer">
        {minutes}:{String(seconds).padStart(2, "0")}
      </span>
      <span className="text-[13px] text-dash-ink-soft">left · try again at {at}</span>
    </p>
  );
}

function PasswordSheet({
  open,
  purpose,
  onClose,
  onDone,
}: {
  open: boolean;
  purpose: "reset" | "unlock";
  onClose: () => void;
  /** Called with the password once it is right. */
  onDone: (password: string) => void;
}) {
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      const result =
        purpose === "unlock"
          ? await unlockWithPasswordAction({ password })
          : await checkPasswordAction({ password });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      const typed = password;
      setPassword("");
      setError(null);
      onDone(typed);
    });
  }

  return (
    <Sheet open={open} onOpenChange={(next) => (next ? undefined : onClose())}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="flex min-h-0 flex-1 flex-col"
      >
        <SheetHeader
          title={purpose === "reset" ? "Reset your journal PIN" : "Unlock with your password"}
          description={
            purpose === "reset"
              ? "Enter the password you sign in with, then choose a new PIN. Your entries won't change."
              : "Enter the password you sign in with to open your journal."
          }
        />
        <SheetBody>
          <label htmlFor="journal-password" className="text-[13px] font-medium">
            Account password
          </label>
          <div className="mt-1.5 flex h-12 items-center rounded-xl border-2 border-dash-ink bg-dash-well pr-2 focus-within:ring-3 focus-within:ring-ring/40">
            <input
              id="journal-password"
              type={show ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(null);
              }}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? "journal-password-error" : undefined}
              className="h-full min-w-0 flex-1 bg-transparent px-3 text-base outline-none"
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              aria-pressed={show}
              className="h-9 rounded-lg px-2 text-[13px] font-semibold text-dash-ink outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {show ? "Hide" : "Show"}
            </button>
          </div>
          {error ? (
            <p
              id="journal-password-error"
              role="alert"
              className="mt-2 text-[13px] font-medium text-dash-bad"
            >
              {error}
            </p>
          ) : null}
        </SheetBody>
        <SheetFooter>
          <DashButton
            type="submit"
            disabled={pending || !password}
            className="h-12! font-semibold max-md:flex-1 md:h-10!"
          >
            {pending ? "Checking…" : "Continue"}
          </DashButton>
          <DashButton
            variant="secondary"
            onClick={onClose}
            className="h-12! max-md:flex-1 md:h-10!"
          >
            Cancel
          </DashButton>
        </SheetFooter>
      </form>
    </Sheet>
  );
}

const pill =
  "inline-flex h-10 items-center rounded-full bg-dash-well px-4 text-[13px] font-medium text-dash-ink outline-none hover:bg-dash-edge focus-visible:ring-3 focus-visible:ring-ring/50";
const roundButton =
  "grid h-11 min-w-11 place-items-center rounded-full bg-dash-card text-dash-ink shadow-(--dash-card-shadow) outline-none focus-visible:ring-3 focus-visible:ring-ring/50";

export function JournalLockScreen({
  initial,
  pinLength,
  until,
  dateLabel,
  locale,
}: {
  initial: "choose" | "locked" | "paused";
  pinLength: 4 | 6;
  until?: string;
  dateLabel: string;
  locale: string;
}) {
  const router = useRouter();
  useFullScreenOnPhone();
  const [screen, setScreen] = useState<Screen>(() =>
    initial === "choose"
      ? { name: "choose", step: 1, length: 4 }
      : initial === "paused" && until
        ? { name: "paused", until: new Date(until).getTime() }
        : { name: "locked" },
  );
  const [error, setError] = useState<string | null>(null);
  const [errorKey, setErrorKey] = useState(0);
  const [pending, startTransition] = useTransition();
  const [sheet, setSheet] = useState<"reset" | "unlock" | null>(null);

  const showError = (message: string) => {
    setError(message);
    setErrorKey((k) => k + 1);
  };

  function opened() {
    clearLocked();
    router.refresh();
  }

  function goBack() {
    if (window.history.length > 1) router.back();
    else router.push("/");
  }

  function onPin(pin: string) {
    if (screen.name === "choose") {
      if (screen.step === 1) {
        setError(null);
        setScreen({ ...screen, step: 2, first: pin });
        return;
      }
      const choice = screen;
      startTransition(async () => {
        const confirm = { pin: choice.first, confirm: pin };
        const result = choice.resetPassword
          ? await resetJournalPinAction({ password: choice.resetPassword, ...confirm })
          : await turnOnJournalLockAction(confirm);
        if (!result.ok) {
          setScreen({
            name: "choose",
            step: 1,
            length: choice.length,
            resetPassword: choice.resetPassword,
          });
          showError(result.fieldErrors?.confirm ?? result.error);
          return;
        }
        opened();
      });
      return;
    }
    startTransition(async () => {
      const result = await unlockJournalAction({ pin });
      if (!result.ok) {
        showError(result.error);
        return;
      }
      if (result.data.paused) {
        setScreen({ name: "paused", until: new Date(result.data.paused).getTime() });
        return;
      }
      opened();
    });
  }

  const choosing = screen.name === "choose";

  const header = (
    <div className="flex h-11 items-center justify-between">
      {choosing ? (
        <button
          type="button"
          onClick={goBack}
          className={cn(roundButton, "px-4 text-[13px] font-semibold")}
        >
          Cancel
        </button>
      ) : (
        <button type="button" onClick={goBack} aria-label="Back" className={roundButton}>
          <ArrowLeft aria-hidden className="size-4" />
        </button>
      )}
      <span className="font-mono text-[12px] text-dash-ink-soft">
        {choosing ? `Step ${screen.step} of 2` : dateLabel}
      </span>
    </div>
  );

  const passwordSheet = (
    <PasswordSheet
      open={sheet !== null}
      purpose={sheet ?? "reset"}
      onClose={() => setSheet(null)}
      onDone={(password) => {
        const purpose = sheet;
        setSheet(null);
        if (purpose === "unlock") {
          opened();
          return;
        }
        setError(null);
        setScreen({ name: "choose", step: 1, length: pinLength, resetPassword: password });
      }}
    />
  );

  if (screen.name === "paused") {
    return (
      <div className="dash mx-auto flex min-h-[calc(100dvh-2rem)] w-full max-w-md flex-col px-4 pt-4 pb-8 md:min-h-0 md:pt-[10vh]">
        <div className="md:hidden">{header}</div>
        <section className="mt-10 rounded-3xl border border-dash-edge bg-dash-card p-6 md:mt-0">
          <span className="grid size-10 place-items-center rounded-full bg-dash-well">
            <Timer aria-hidden className="size-5" />
          </span>
          <h1 className="mt-4 font-display text-2xl font-semibold">PIN entry is paused</h1>
          <p className="mt-2 text-[14px] text-dash-ink-soft">
            After 5 wrong tries the Journal waits before you can try again. Your entries are safe.
          </p>
          <div className="mt-5 border-t border-dash-edge pt-5">
            <Countdown
              until={screen.until}
              locale={locale}
              onDone={() => setScreen({ name: "locked" })}
            />
          </div>
        </section>
        <div className="mt-auto flex flex-col gap-2.5 pt-8 md:mt-6">
          <DashButton onClick={() => setSheet("unlock")} className="h-12! w-full font-semibold">
            Unlock with account password
          </DashButton>
          <DashButton variant="secondary" onClick={() => router.push("/")} className="h-12! w-full">
            Back to Home
          </DashButton>
        </div>
        {passwordSheet}
      </div>
    );
  }

  const title = choosing
    ? screen.step === 2
      ? "Type it again"
      : screen.resetPassword
        ? "Choose a new PIN"
        : "Choose a journal PIN"
    : "Journal is locked";

  return (
    <div className="dash mx-auto flex min-h-[calc(100dvh-2rem)] w-full max-w-md flex-col px-4 pt-4 pb-8 md:min-h-0 md:max-w-lg md:pt-[12vh]">
      <div className="md:hidden">{header}</div>
      <section className="flex flex-1 flex-col items-center text-center md:rounded-3xl md:border md:border-dash-edge md:bg-dash-card md:p-10">
        <span
          className={cn(
            "mt-8 grid size-12 place-items-center rounded-full md:mt-0",
            choosing ? "bg-dash-ink text-dash-card" : "bg-dash-well text-dash-ink",
          )}
        >
          <Lock aria-hidden className="size-5" />
        </span>
        <h1 className="mt-5 font-display text-[28px] leading-tight font-semibold">{title}</h1>
        <p className="mt-2 text-[14px] text-dash-ink-soft">
          {choosing ? (
            screen.step === 2 ? (
              "Enter the same PIN to confirm."
            ) : (
              "You'll enter it each time you open the Journal."
            )
          ) : (
            <>
              <span className="md:hidden">Enter your PIN</span>
              <span className="hidden md:inline">Type your PIN. It unlocks on the last digit.</span>
            </>
          )}
        </p>

        <div className="mt-8 w-full">
          <PinPad
            key={choosing ? `${screen.step}-${screen.length}` : "unlock"}
            length={choosing ? screen.length : pinLength}
            onComplete={onPin}
            error={error ? `${error}#${errorKey}` : null}
            busy={pending}
            label={choosing ? (screen.step === 1 ? "New PIN" : "Confirm PIN") : "PIN"}
          />
        </div>

        <p
          role="alert"
          className={cn(
            "mt-5 inline-flex min-h-8 items-center rounded-full px-3 text-[13px] font-medium",
            error ? "bg-dash-bad-bg text-dash-bad" : "invisible",
          )}
        >
          {error ?? "."}
        </p>

        <div className="mt-auto pt-6 md:mt-4 md:pt-0">
          {choosing ? (
            screen.step === 1 ? (
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setScreen({ ...screen, length: screen.length === 4 ? 6 : 4 });
                }}
                className="min-h-11 text-[14px] font-semibold text-dash-ink outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                Use a {screen.length === 4 ? 6 : 4}-digit PIN
              </button>
            ) : null
          ) : (
            <>
              <button
                type="button"
                onClick={() => setSheet("reset")}
                className="min-h-11 text-[14px] text-dash-ink-soft outline-none hover:text-dash-ink focus-visible:ring-3 focus-visible:ring-ring/50 md:hidden"
              >
                Forgot PIN?
              </button>
              <div className="hidden gap-2 md:flex">
                <button type="button" onClick={() => setSheet("reset")} className={pill}>
                  Forgot PIN?
                </button>
                <button type="button" onClick={() => setSheet("unlock")} className={pill}>
                  Use account password
                </button>
              </div>
            </>
          )}
        </div>
      </section>
      {passwordSheet}
    </div>
  );
}

/** "Lock now" in the journal header (screen 7h), with Ctrl+Shift+L. */
export function LockNowButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const lock = () => startTransition(() => lockJournalNow(() => router.refresh()));
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "l") {
        e.preventDefault();
        markJournalLocked();
        void lockJournalAction({}).then(() => router.refresh());
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);
  return (
    <button
      type="button"
      onClick={lock}
      disabled={pending}
      title="Lock now (Ctrl+Shift+L)"
      className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full bg-dash-card px-3.5 text-[13px] font-semibold text-dash-ink shadow-(--dash-card-shadow) outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50 md:h-9"
    >
      <Lock aria-hidden className="size-3.5" />
      Lock now
    </button>
  );
}

/** When the lock is off: turn it on from the Journal (screen 7a). */
export function TurnOnLockLink() {
  return (
    <Link
      href="/journal?lock=setup"
      className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full bg-dash-card px-3.5 text-[13px] font-medium text-dash-ink-soft shadow-(--dash-card-shadow) outline-none hover:text-dash-ink focus-visible:ring-3 focus-visible:ring-ring/50 md:h-9"
    >
      <Lock aria-hidden className="size-3.5" />
      Lock with a PIN
    </Link>
  );
}
