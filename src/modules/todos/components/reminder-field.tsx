"use client";

import { Bell, Check, ChevronRight } from "lucide-react";
import { useRef, useState } from "react";
import { todayIn, timeNowIn } from "@/lib/dates";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { ReminderChoice } from "@/modules/reminders/schema";
import { atDueLabel, beforeLabel, BEFORE_CHOICES, choiceLabel } from "../reminders";

const option =
  "flex min-h-11 w-full items-center gap-2 rounded-xl px-3 text-left text-[14px] font-medium outline-none transition-colors duration-150 focus-visible:ring-3 focus-visible:ring-ring/50 md:min-h-9";

const timeInput =
  "h-11 min-w-0 flex-1 rounded-xl bg-dash-well px-3 text-[14px] text-dash-ink outline-none focus-visible:ring-3 focus-visible:ring-ring/50 md:h-10";

/**
 * The Reminder choice of a task (docs/reminders-spec.md §3, §5): None, At due time, the "before"
 * times, or a Custom date and time. It is a button that opens a list; every pick is reported at
 * once (the drawer autosaves, quick add keeps it for when the task is saved).
 *
 * `value` is the task's own choice, or null when it has none. With no choice of its own the task
 * may still get the Settings default (`defaultChoice`), and the button then says so. `onChange`
 * gets a choice, or null to take the choice away (back to the default, or to nothing).
 * Without a due date there is nothing to remind about: the button is disabled with a hint.
 */
export function ReminderField({
  value,
  defaultChoice,
  hasDate,
  hasTime,
  dueDate,
  dueTime,
  morningTime,
  today,
  timeZone,
  locale,
  onChange,
  triggerClassName,
}: {
  value: ReminderChoice | null;
  defaultChoice: ReminderChoice | null;
  hasDate: boolean;
  hasTime: boolean;
  /** The task's due date, offered as the start of a custom reminder. */
  dueDate: string | null;
  /** The task's due time, offered as the time of a custom reminder on another day. */
  dueTime: string | null;
  morningTime: string;
  today: string;
  /** The person's time zone, used to refuse a custom moment that has already passed. */
  timeZone: string;
  locale: string;
  onChange: (choice: ReminderChoice | null) => void;
  triggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const effective = value ?? defaultChoice;
  const fromDefault = value === null && defaultChoice !== null;
  const labelOptions = { hasTime, morningTime, today, locale };
  const text =
    effective && effective.kind !== "none" ? choiceLabel(effective, labelOptions) : "None";

  const [editingCustom, setEditingCustom] = useState(false);
  const [customDate, setCustomDate] = useState("");
  const [customTime, setCustomTime] = useState("");
  const [customError, setCustomError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  /** Start of a custom reminder: the saved one, or a sensible first guess. */
  function startCustom() {
    if (value?.kind === "custom") {
      setCustomDate(value.date);
      setCustomTime(value.time);
    } else {
      const now = new Date();
      const todayNow = todayIn(timeZone, now);
      const date = dueDate ?? todayNow;
      let time = dueTime ? dueTime.slice(0, 5) : "09:00";
      if (date === todayNow) {
        const hour = Number(timeNowIn(timeZone, now).slice(0, 2));
        time = hour >= 23 ? "23:59" : `${String(hour + 1).padStart(2, "0")}:00`;
      }
      setCustomDate(date);
      setCustomTime(time);
    }
    setCustomError(null);
    setEditingCustom(true);
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      if (value?.kind === "custom") startCustom();
      else setEditingCustom(false);
    }
  }

  function pick(choice: ReminderChoice) {
    setEditingCustom(false);
    onChange(choice);
    setOpen(false);
  }

  /** None takes the reminder away; with a default in play it must say "no" out loud. */
  function pickNone() {
    setEditingCustom(false);
    onChange(defaultChoice ? { kind: "none" } : null);
    setOpen(false);
  }

  function setCustom() {
    if (!customDate || !customTime) {
      setCustomError("Pick a date and a time.");
      return;
    }
    const now = new Date();
    if (`${customDate}T${customTime}` <= `${todayIn(timeZone, now)}T${timeNowIn(timeZone, now)}`) {
      setCustomError("That moment has already passed. Pick a later one.");
      return;
    }
    setCustomError(null);
    onChange({ kind: "custom", date: customDate, time: customTime });
    setEditingCustom(false);
    setOpen(false);
  }

  function customKey(e: React.KeyboardEvent) {
    if (e.key !== "Enter") return;
    e.preventDefault();
    e.stopPropagation();
    setCustom();
  }

  if (!hasDate) {
    return (
      <button
        type="button"
        disabled
        aria-label="Reminder. Set a date first."
        className={cn(triggerClassName, "cursor-not-allowed text-dash-ink-soft")}
      >
        <span className="truncate font-normal">Set a date first</span>
      </button>
    );
  }

  const selected = effective ?? { kind: "none" as const };
  const rows: { key: string; label: string; on: boolean; choose: () => void }[] = [
    {
      key: "none",
      label: "None",
      on: !editingCustom && selected.kind === "none",
      choose: pickNone,
    },
    {
      key: "at_due",
      label: atDueLabel(hasTime, morningTime, locale),
      on: !editingCustom && selected.kind === "at_due",
      choose: () => pick({ kind: "at_due" }),
    },
    ...BEFORE_CHOICES.map((minutes) => ({
      key: `before-${minutes}`,
      label: beforeLabel(minutes),
      on: !editingCustom && selected.kind === "before" && selected.offsetMinutes === minutes,
      choose: () => pick({ kind: "before", offsetMinutes: minutes }),
    })),
    {
      key: "custom",
      label: "Custom",
      on: editingCustom || selected.kind === "custom",
      choose: startCustom,
    },
  ];

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={triggerClassName}
          aria-label={`Reminder: ${text}. Change.`}
        >
          <span
            className={cn(
              "flex min-w-0 flex-col items-end text-right",
              text === "None" && "font-normal text-dash-ink-soft",
            )}
          >
            <span className="truncate">{text}</span>
            {fromDefault ? (
              <span className="text-[11px] leading-tight font-normal text-dash-ink-soft">
                From your default
              </span>
            ) : null}
          </span>
          <ChevronRight aria-hidden className="size-4 shrink-0 text-dash-ink-soft" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        collisionPadding={16}
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          const chosen = listRef.current?.querySelector<HTMLElement>('[aria-pressed="true"]');
          (chosen ?? listRef.current?.querySelector<HTMLElement>("button"))?.focus();
        }}
        className="dash max-h-(--radix-popover-content-available-height) w-[min(20rem,calc(100vw-2rem))] overflow-y-auto rounded-3xl border border-dash-edge bg-dash-card p-2 text-dash-ink shadow-[0_24px_48px_-16px_rgb(0_0_0/0.3)]"
      >
        <h2 className="flex items-center gap-2 px-3 pt-2 pb-1 font-display text-lg font-semibold">
          <Bell aria-hidden className="size-4" /> Reminder
        </h2>
        <div ref={listRef} role="group" aria-label="Reminder" className="flex flex-col">
          {rows.map((row) => (
            <button
              key={row.key}
              type="button"
              aria-pressed={row.on}
              onClick={row.choose}
              className={cn(
                option,
                row.on ? "bg-dash-well font-semibold" : "hover:bg-dash-well/70",
              )}
            >
              <span className="grid size-4 shrink-0 place-items-center">
                {row.on ? <Check aria-hidden className="size-4" strokeWidth={2.5} /> : null}
              </span>
              {row.label}
            </button>
          ))}
        </div>
        {editingCustom ? (
          <div className="px-3 pt-2 pb-3">
            <div className="flex gap-2">
              <label className="sr-only" htmlFor="reminder-custom-date">
                Reminder date
              </label>
              <input
                id="reminder-custom-date"
                type="date"
                min={today}
                value={customDate}
                onChange={(e) => {
                  setCustomDate(e.target.value);
                  setCustomError(null);
                }}
                onKeyDown={customKey}
                className={timeInput}
              />
              <label className="sr-only" htmlFor="reminder-custom-time">
                Reminder time
              </label>
              <input
                id="reminder-custom-time"
                type="time"
                value={customTime}
                onChange={(e) => {
                  setCustomTime(e.target.value);
                  setCustomError(null);
                }}
                onKeyDown={customKey}
                className={timeInput}
              />
            </div>
            {customError ? (
              <p role="alert" className="mt-2 text-[13px] font-medium text-dash-bad">
                {customError}
              </p>
            ) : null}
            <button
              type="button"
              onClick={setCustom}
              className="mt-2 flex min-h-11 w-full items-center justify-center rounded-xl bg-dash-ink px-3 text-[14px] font-semibold text-dash-card outline-none focus-visible:ring-3 focus-visible:ring-ring/50 md:min-h-9"
            >
              Set reminder
            </button>
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
