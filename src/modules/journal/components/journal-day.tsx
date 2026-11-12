"use client";

import {
  Annoyed,
  CalendarClock,
  ChevronDown,
  ChevronRight,
  CircleCheckBig,
  Frown,
  Laugh,
  Meh,
  PiggyBank,
  ReceiptIndianRupee,
  Smile,
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
  spent: ReceiptIndianRupee,
  slipped: CalendarClock,
  money: PiggyBank,
};

const MOOD_ICONS: Record<number, LucideIcon> = {
  1: Frown,
  2: Annoyed,
  3: Meh,
  4: Smile,
  5: Laugh,
};

/** Columns for the wide-screen tiles, one per fact. */
const TILE_COLUMNS: Record<number, string> = {
  3: "md:grid-cols-3",
  4: "md:grid-cols-2 lg:grid-cols-4",
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
}) {
  const reduceMotion = useReducedMotion();
  const factsId = useId();
  const [folded, setFolded] = useState(false);
  const [body, setBody] = useState(initialBody);
  const [mood, setMood] = useState<number | null>(initialMood);
  const [state, setState] = useState<SaveState>(savedAt ? "saved" : "idle");
  const [lastSavedAt, setLastSavedAt] = useState(savedAt);

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

  return (
    <div className="flex flex-col gap-5">
      <section aria-labelledby={`${factsId}-title`}>
        <h2 id={`${factsId}-title`} className="sr-only">
          Your day
        </h2>
        <AnimatePresence initial={false} mode="popLayout">
          {folded ? (
            <motion.div
              key="folded"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={transition}
            >
              <button
                type="button"
                aria-expanded={false}
                onClick={() => setFolded(false)}
                className="inline-flex min-h-11 max-w-full items-center gap-2 rounded-full border border-dash-edge bg-dash-card px-4 py-2 text-left text-[13px] font-medium text-dash-ink shadow-(--dash-card-shadow) outline-none transition-[transform,background-color] duration-150 ease-snap hover:bg-dash-well focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-[0.98] md:min-h-9"
              >
                <CircleCheckBig aria-hidden className="size-4 shrink-0 text-dash-ink-soft" />
                <span className="min-w-0">
                  <span className="sr-only">Show your day: </span>
                  {summary}
                </span>
                <ChevronDown aria-hidden className="size-4 shrink-0 text-dash-ink-soft" />
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
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="font-mono text-xs text-dash-ink-soft">Your day</p>
                <button
                  type="button"
                  aria-expanded
                  aria-controls={`${factsId}-panel`}
                  onClick={() => setFolded(true)}
                  className="min-h-11 rounded-full px-3 text-[13px] font-medium text-dash-ink-soft outline-none transition-colors duration-150 hover:bg-dash-well hover:text-dash-ink focus-visible:ring-3 focus-visible:ring-ring/50 md:min-h-8"
                >
                  Fold away
                </button>
              </div>
              <ul
                className={cn(
                  "flex flex-col divide-y divide-dash-edge rounded-2xl border border-dash-edge bg-dash-card px-4 shadow-(--dash-card-shadow) md:grid md:gap-2 md:divide-y-0 md:border-0 md:bg-transparent md:px-0 md:shadow-none",
                  TILE_COLUMNS[facts.length],
                )}
              >
                {facts.map((fact) => (
                  <li key={fact.kind}>
                    <FactTile fact={fact} />
                  </li>
                ))}
              </ul>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      <MoodPicker value={mood} onChange={changeMood} isToday={isToday} />

      <div>
        <label htmlFor="journal-body" className="sr-only">
          {isToday ? "Today's page" : "This day's page"}
        </label>
        <textarea
          id="journal-body"
          value={body}
          onChange={(e) => changeBody(e.target.value)}
          onFocus={() => setFolded(true)}
          onBlur={() => void save()}
          maxLength={MAX_JOURNAL_CHARS}
          placeholder={
            isToday ? "How was today? A line is enough." : "What do you remember about this day?"
          }
          aria-describedby="journal-status"
          className="field-sizing-content block min-h-64 w-full resize-none rounded-2xl border border-dash-edge bg-dash-card px-4 py-4 text-base leading-relaxed text-dash-ink shadow-(--dash-card-shadow) outline-none placeholder:text-dash-ink-soft focus-visible:ring-3 focus-visible:ring-ring/40 md:min-h-80 md:px-6 md:py-5"
        />
        <div className="mt-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-1">
          <p
            id="journal-status"
            aria-live="polite"
            className={cn(
              "font-mono text-xs",
              state === "error" ? "font-medium text-dash-bad" : "text-dash-ink-soft",
            )}
          >
            {state === "saving"
              ? "Saving…"
              : state === "error"
                ? "Not saved yet. Check your connection; it will try again as you type."
                : state === "saved" && lastSavedAt
                  ? `Saved · ${formatSavedAt(lastSavedAt, locale, timeZone)}`
                  : "Saves as you write."}
          </p>
          {nearLimit ? (
            <p className="font-mono text-xs text-dash-ink-soft">
              {body.length.toLocaleString(locale)} / {MAX_JOURNAL_CHARS.toLocaleString(locale)}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function FactTile({ fact }: { fact: ShownFact }) {
  const Icon = FACT_ICONS[fact.kind];
  return (
    <Link
      href={fact.href}
      className="group/fact flex min-h-15 items-center gap-3 py-3 outline-none focus-visible:ring-3 focus-visible:ring-ring/50 md:h-full md:flex-col md:items-start md:gap-2 md:rounded-2xl md:border md:border-dash-edge md:bg-dash-card md:p-4 md:shadow-(--dash-card-shadow) md:transition-[transform,background-color] md:duration-150 md:ease-snap md:hover:bg-dash-well md:active:scale-[0.98]"
    >
      <span
        aria-hidden
        className={cn(
          "grid size-9 shrink-0 place-items-center rounded-full bg-dash-well",
          fact.empty ? "text-dash-good" : "text-dash-ink",
        )}
      >
        <Icon className="size-[18px]" strokeWidth={1.75} />
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            "block text-[15px] font-semibold md:font-display md:text-lg md:tracking-tight",
            fact.empty && "font-medium md:font-semibold",
          )}
        >
          {fact.title}
        </span>
        {fact.detail ? (
          <span className="block text-[13px] text-pretty text-dash-ink-soft">{fact.detail}</span>
        ) : null}
      </span>
      <ChevronRight
        aria-hidden
        className="size-4 shrink-0 text-dash-ink-soft transition-transform duration-150 ease-snap group-hover/fact:translate-x-0.5 md:hidden"
      />
    </Link>
  );
}

function MoodPicker({
  value,
  onChange,
  isToday,
}: {
  value: number | null;
  onChange: (value: number | null) => void;
  isToday: boolean;
}) {
  const label = isToday ? "How did today feel?" : "How did this day feel?";
  return (
    <div
      role="radiogroup"
      aria-label={`${label} (optional)`}
      className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2"
    >
      <p aria-hidden className="text-sm text-dash-ink-soft">
        {label}
        {value ? <span className="ml-1.5 text-xs">Tap again to clear.</span> : null}
      </p>
      <div className="flex gap-1.5">
        {MOODS.map((m) => {
          const Icon = MOOD_ICONS[m.value];
          const checked = value === m.value;
          return (
            <label
              key={m.value}
              title={m.label}
              className={cn(
                "relative grid size-11 cursor-pointer place-items-center rounded-full transition-[transform,background-color,color] duration-150 ease-snap select-none has-focus-visible:ring-3 has-focus-visible:ring-ring/50 active:scale-95 md:size-10",
                checked
                  ? "bg-dash-ink text-dash-card"
                  : "bg-dash-well text-dash-ink-soft hover:bg-dash-edge hover:text-dash-ink",
              )}
            >
              <input
                type="radio"
                name="journal-mood"
                value={m.value}
                checked={checked}
                aria-label={m.label}
                onChange={() => onChange(m.value)}
                onClick={checked ? () => onChange(null) : undefined}
                onKeyDown={
                  checked
                    ? (e) => {
                        if (e.key === "Delete" || e.key === "Backspace") onChange(null);
                      }
                    : undefined
                }
                className="absolute inset-0 m-0 cursor-pointer appearance-none rounded-full opacity-0"
              />
              <Icon aria-hidden className="size-5" strokeWidth={1.75} />
            </label>
          );
        })}
      </div>
    </div>
  );
}

function formatSavedAt(iso: string, locale: string, timeZone: string): string {
  return new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit", timeZone }).format(
    new Date(iso),
  );
}
