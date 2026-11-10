"use client";

import { CalendarDays, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { addDaysIso, formatDue, nextWeekStart, trimTime } from "@/lib/dates";
import type { DateContext } from "./types";

type Due = { dueDate: string | null; dueTime: string | null };

/**
 * Date picker with quick options (Today, Tomorrow, Next week, No date), a typed date field
 * (the browser's date input) and an optional time (CLAUDE.md §6.2).
 */
export function DueDateField({
  value,
  ctx,
  onChange,
}: {
  value: Due;
  ctx: DateContext;
  onChange: (next: Due) => void;
}) {
  const [open, setOpen] = useState(false);

  const quick = [
    { label: "Today", date: ctx.today },
    { label: "Tomorrow", date: addDaysIso(ctx.today, 1) },
    { label: "Next week", date: nextWeekStart(ctx.today, ctx.weekStartsOn) },
  ];

  function pick(dueDate: string | null) {
    onChange({ dueDate, dueTime: dueDate ? value.dueTime : null });
    if (dueDate === null) setOpen(false);
  }

  const label = value.dueDate
    ? formatDue(value.dueDate, value.dueTime, ctx.today, ctx.locale)
    : "Add date";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="h-11 justify-start gap-2 md:h-8"
          aria-label={`Due date: ${value.dueDate ? label : "none"}. Change.`}
        >
          <CalendarDays aria-hidden />
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72">
        <div className="flex flex-wrap gap-2">
          {quick.map((q) => (
            <Button
              key={q.label}
              type="button"
              variant={value.dueDate === q.date ? "default" : "outline"}
              className="h-11 md:h-8"
              onClick={() => pick(q.date)}
            >
              {q.label}
            </Button>
          ))}
          <Button
            type="button"
            variant="outline"
            className="h-11 gap-1 md:h-8"
            onClick={() => pick(null)}
          >
            <X /> No date
          </Button>
        </div>
        <div className="mt-3 flex flex-col gap-2">
          <Label htmlFor="due-date-input">Date</Label>
          <Input
            id="due-date-input"
            type="date"
            value={value.dueDate ?? ""}
            onChange={(e) => pick(e.target.value || null)}
            className="h-11 md:h-8"
          />
        </div>
        <div className="mt-3 flex flex-col gap-2">
          <Label htmlFor="due-time-input">Time (optional)</Label>
          <div className="flex items-center gap-2">
            <Input
              id="due-time-input"
              type="time"
              value={value.dueTime ? trimTime(value.dueTime) : ""}
              disabled={!value.dueDate}
              onChange={(e) =>
                onChange({ dueDate: value.dueDate, dueTime: e.target.value || null })
              }
              className="h-11 md:h-8"
            />
            {value.dueTime ? (
              <Button
                type="button"
                variant="ghost"
                className="h-11 md:h-8"
                onClick={() => onChange({ dueDate: value.dueDate, dueTime: null })}
              >
                Clear time
              </Button>
            ) : null}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
