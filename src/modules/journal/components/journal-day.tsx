"use client";

import {
  AlertCircle,
  CalendarClock,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  CircleCheckBig,
  IndianRupee,
  PiggyBank,
  type LucideIcon,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion, type Transition } from "motion/react";
import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { saveJournalEntryAction } from "../actions";
import type { Fact, FactKind } from "../day-facts";
import { MAX_JOURNAL_CHARS, MOODS } from "../limits";

export type ShownFact = Fact & { href: string };

const FACT_ICONS: Record<FactKind, LucideIcon> = {
  tasks: CircleCheckBig,
  spent: IndianRupee,
  slipped: CalendarClock,
  money: PiggyBank,
};

const FOLD: Transition = { duration: 0.2, ease: [0.23, 1, 0.32, 1] };
const AUTOSAVE_MS = 800;

type SaveState = "idle" | "saving" | "saved" | "error";

/**
 * One journal day (docs/journal-spec.md): the day's facts first, then mood and the page. The facts
 * fold into one line as soon as you start writing (or with "Fold away"); tap the line to open
 * them again. Everything saves by itself, a moment after you stop typing and when you leave.
 */
export function JournalDay({
  date,
  isToday,
  facts,
  summary,
  initialBody,
  initialMood,
  savedAt,
  locale,
  timeZone,
  relativeLabel,
  longDate,
}: {
  date: string;
  isToday: boolean;
  facts: ShownFact[];
  summary: string;
  initialBody: string;
  initialMood: number | null;
  savedAt: string | null;
  locale: string;
  timeZone: string;
  /** "Today", "Yesterday" or the weekday: the line above the page. */
  relativeLabel: string;
  /** "Thursday, 12 November": the desktop title. */
  longDate: string;
}) {
  const reduceMotion = useReducedMotion();
  const factsId = useId();
  const [folded, setFolded] = useState(false);
  const [body, setBody] = useState(initialBody);
  const [mood, setMood] = useState<number | null>(initialMood);
  const [state, setState] = useState<SaveState>(savedAt ? "saved" : "idle");
  const [lastSavedAt, setLastSavedAt] = useState(savedAt);
  const [writing, setWriting] = useState(false);
  const textRef = useRef<HTMLTextAreaElement>(null);

  // What the server has, and what is on screen, for "is there anything to save?".
  const saved = useRef({ body: initialBody, mood: initialMood });
  const latest = useRef({ body: initialBody, mood: initialMood });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const save = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const next = latest.current;
    if (next.body === saved.current.body && next.mood === saved.current.mood) return;
    setState("saving");
    try {
      const result = await saveJournalEntryAction({ date, body: next.body, mood: next.mood });
      if (!result.ok) {
        setState("error");
        return;
      }
      saved.current = next;
      setLastSavedAt(result.data.savedAt);
      // Still typing? Then "saving" stays until the next save lands.
      const now = latest.current;
      setState(now.body === next.body && now.mood === next.mood ? "saved" : "saving");
    } catch {
      setState("error");
    }
  }, [date]);

  // Save a moment after the last key.
  function changeBody(value: string) {
    setBody(value);
    latest.current = { ...latest.current, body: value };
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void save(), AUTOSAVE_MS);
  }

  function changeMood(value: number | null) {
    setMood(value);
    latest.current = { ...latest.current, mood: value };
    void save();
  }

  // Leaving the day (another day, another page): save what is left. Closing the tab: warn first.
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      const now = latest.current;
      if (now.body !== saved.current.body || now.mood !== saved.current.mood) {
        event.preventDefault();
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => {
      window.removeEventListener("beforeunload", warn);
      void save();
    };
  }, [save]);

  const transition = reduceMotion ? { duration: 0 } : FOLD;
  const nearLimit = body.length > MAX_JOURNAL_CHARS * 0.9;
  const full = body.length >= MAX_JOURNAL_CHARS;
  const moodLabel = MOODS.find((m) => m.value === mood)?.label;

  return (
    <div className="flex flex-col gap-4 md:gap-5">
      {/* Which day this is in words, and the save status (docs/new_design.md screens 4a, 4d). */}
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-xs font-medium text-dash-ink-soft">{relativeLabel}</p>
          <h2 className="mt-1 hidden font-display text-[40px] leading-[1.05] font-semibold tracking-[-0.02em] md:block">
            {longDate}
          </h2>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <p
            id="journal-status"
            aria-live="polite"
            className={cn(
              "inline-flex items-center gap-1 text-xs",
              state === "error" ? "font-semibold text-dash-bad" : "text-dash-ink-soft",
            )}
          >
            {state === "saving" ? (
              <>
                <span aria-hidden className="size-1.5 rounded-full bg-dash-accent" />
                Saving…
              </>
            ) : state === "error" ? (
              <>
                <AlertCircle aria-hidden className="size-3.5" />
                Not saved
              </>
            ) : state === "saved" && lastSavedAt ? (
              <>
                <Check aria-hidden className="size-3.5" />
                Saved {formatSavedAt(lastSavedAt, locale, timeZone)}
              </>
            ) : (
              "Saves as you write"
            )}
          </p>
          {state === "error" ? (
            <button
              type="button"
              onClick={() => void save()}
              className="h-11 rounded-full px-2 text-xs font-semibold text-dash-ink underline underline-offset-4 outline-none focus-visible:ring-3 focus-visible:ring-ring/50 md:h-8"
            >
              Retry
            </button>
          ) : null}
          {writing ? (
            <button
              type="button"
              onClick={() => textRef.current?.blur()}
              className="h-11 rounded-full bg-dash-well px-4 text-[13px] font-semibold text-dash-ink outline-none focus-visible:ring-3 focus-visible:ring-ring/50 md:hidden"
            >
              Done
            </button>
          ) : null}
        </div>
      </div>

      <section aria-labelledby={`${factsId}-title`}>
        <AnimatePresence initial={false} mode="popLayout">
          {folded ? (
            <motion.div
              key="folded"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={transition}
            >
              <h2 id={`${factsId}-title`} className="sr-only">
                The day in facts
              </h2>
              <button
                type="button"
                aria-expanded={false}
                onClick={() => setFolded(false)}
                className="flex min-h-11 w-full items-center justify-between gap-3 rounded-full border border-dash-edge bg-dash-card px-4 py-2 text-left text-[13px] text-dash-ink shadow-(--dash-card-shadow) outline-none transition-colors duration-150 hover:bg-dash-well focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <span className="min-w-0 truncate">
                  {summary}
                  {moodLabel ? ` · ${moodLabel}` : ""}
                </span>
                <span className="inline-flex shrink-0 items-center gap-1 font-semibold">
                  <span className="md:hidden">Show</span>
                  <span className="hidden md:inline">Show facts</span>
                  <ChevronDown aria-hidden className="size-4" />
                </span>
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="open"
              id={`${factsId}-panel`}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={transition}
              className="overflow-hidden"
            >
              <div className="rounded-2xl border border-dash-edge bg-dash-card px-4 pt-2 pb-1 shadow-(--dash-card-shadow)">
                <div className="flex items-center justify-between gap-3">
                  <h2 id={`${factsId}-title`} className="text-[13px] font-semibold">
                    The day in facts
                  </h2>
                  <button
                    type="button"
                    aria-expanded
                    aria-controls={`${factsId}-panel`}
                    onClick={() => setFolded(true)}
                    className="-mr-2 inline-flex min-h-11 items-center gap-1 rounded-full px-2 text-[13px] font-semibold text-dash-ink outline-none transition-colors duration-150 hover:bg-dash-well focus-visible:ring-3 focus-visible:ring-ring/50 md:min-h-8"
                  >
                    Fold
                    <ChevronUp aria-hidden className="size-4" />
                  </button>
                </div>
                <ul className="flex flex-col divide-y divide-dash-edge">
                  {facts.map((fact) => (
                    <li key={fact.kind}>
                      <FactRow fact={fact} />
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      <MoodPicker value={mood} onChange={changeMood} />

      <div>
        <label htmlFor="journal-body" className="sr-only">
          {isToday ? "Today's page" : "This day's page"}
        </label>
        <textarea
          ref={textRef}
          id="journal-body"
          value={body}
          onChange={(e) => changeBody(e.target.value)}
          onFocus={() => {
            setFolded(true);
            setWriting(true);
          }}
          onBlur={() => {
            setWriting(false);
            void save();
          }}
          maxLength={MAX_JOURNAL_CHARS}
          placeholder="How did today go?"
          aria-describedby="journal-status"
          className="field-sizing-content block min-h-64 w-full resize-none bg-transparent py-1 text-lg leading-[1.7] text-dash-ink outline-none placeholder:text-dash-ink-soft md:min-h-80"
        />
        {nearLimit ? (
          <p
            className={cn(
              "mt-2 inline-flex items-center gap-1 font-mono text-xs",
              full ? "font-semibold text-dash-bad" : "text-dash-warn",
            )}
          >
            <AlertCircle aria-hidden className="size-3.5" />
            {body.length.toLocaleString(locale)} / {MAX_JOURNAL_CHARS.toLocaleString(locale)}{" "}
            characters{full ? ". This page is full." : ""}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function FactRow({ fact }: { fact: ShownFact }) {
  const Icon = FACT_ICONS[fact.kind];
  return (
    <Link
      href={fact.href}
      className="group/fact flex min-h-13 items-center gap-3 py-2.5 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <Icon
        aria-hidden
        className={cn("size-[18px] shrink-0", fact.empty ? "text-dash-good" : "text-dash-ink")}
        strokeWidth={1.75}
      />
      <span className="min-w-0 flex-1 text-[14px] text-pretty">
        <span className="font-semibold">{fact.title}</span>
        {fact.detail ? <span className="text-dash-ink-soft"> · {fact.detail}</span> : null}
      </span>
      <ChevronRight
        aria-hidden
        className="size-4 shrink-0 text-dash-ink-soft transition-transform duration-150 ease-snap group-hover/fact:translate-x-0.5"
      />
    </Link>
  );
}

/**
 * Mood as a five-step segmented control in words (docs/new_design.md §5 "Journal page"): the
 * chosen one is raised with a check; choosing it again clears it, as does "Clear".
 */
function MoodPicker({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (value: number | null) => void;
}) {
  return (
    <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-3">
      <p id="mood-label" className="text-[13px] text-dash-ink-soft">
        Mood
      </p>
      <div className="flex items-center gap-2">
        <div
          role="radiogroup"
          aria-labelledby="mood-label"
          className="grid flex-1 grid-cols-5 gap-0.5 rounded-full bg-dash-well p-1 md:flex-none"
        >
          {MOODS.map((m) => {
            const checked = value === m.value;
            return (
              <button
                key={m.value}
                type="button"
                role="radio"
                aria-checked={checked}
                onClick={() => onChange(checked ? null : m.value)}
                className={cn(
                  "inline-flex h-10 items-center justify-center gap-1 rounded-full px-2 text-[13px] font-medium outline-none transition-[background-color,color] duration-150 focus-visible:ring-3 focus-visible:ring-ring/50 md:h-8 md:px-3",
                  checked
                    ? "bg-dash-raised font-semibold text-dash-ink shadow-(--dash-lift)"
                    : "text-dash-ink-soft hover:text-dash-ink",
                )}
              >
                {checked ? <Check aria-hidden className="size-3.5 shrink-0" /> : null}
                {m.label}
              </button>
            );
          })}
        </div>
        {value ? (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="hidden h-8 rounded-full px-2 text-[13px] font-medium text-dash-ink-soft outline-none hover:text-dash-ink focus-visible:ring-3 focus-visible:ring-ring/50 md:inline"
          >
            Clear
          </button>
        ) : null}
      </div>
    </div>
  );
}

function formatSavedAt(iso: string, locale: string, timeZone: string): string {
  return new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit", timeZone }).format(
    new Date(iso),
  );
}
