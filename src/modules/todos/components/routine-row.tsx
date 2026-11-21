"use client";

import { Repeat, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { formatTime } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { useTaskLinks } from "./use-task-links";

/**
 * One frequent repeat in Upcoming's Repeating card (O, 2026-11-22): shown once, not on every day.
 * A dashed ring with the repeat icon (it is ticked in Today, on its day), the title, how often it
 * repeats and until when, and when it is next due. The row opens the task.
 */
export function RoutineRow({
  taskId,
  title,
  repeatText,
  nextText,
  dueTime,
  listName,
  overdue,
  locale,
}: {
  taskId: string;
  title: string;
  repeatText: string;
  nextText: string;
  dueTime: string | null;
  listName: string;
  overdue: boolean;
  locale?: string;
}) {
  const { hrefFor } = useTaskLinks();
  return (
    <li className="-mx-2 rounded-xl px-1 transition-colors duration-150 hover:bg-dash-well/70">
      <Link
        href={hrefFor(taskId)}
        scroll={false}
        className="flex min-h-11 items-start gap-0.5 rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50 md:min-h-9"
      >
        <span aria-hidden className="grid size-11 shrink-0 place-items-center md:size-9">
          <span className="grid size-5 place-items-center rounded-full border-[1.5px] border-dashed border-dash-ink-soft/70 text-dash-ink-soft">
            <Repeat className="size-2.5" strokeWidth={2.5} />
          </span>
        </span>
        <span className="min-w-0 py-2">
          <span className="block text-[15px] leading-snug break-words md:text-sm">{title}</span>
          <span className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-dash-ink-soft">
            <span className="inline-flex items-center gap-1">
              <Repeat aria-hidden className="size-3.5" />
              {repeatText}
            </span>
            <span
              className={cn(
                "inline-flex items-center gap-1",
                overdue && "font-semibold text-dash-bad",
              )}
            >
              {overdue ? (
                <TriangleAlert aria-hidden className="size-3.5" strokeWidth={2.25} />
              ) : null}
              {nextText}
              {dueTime ? `, ${formatTime(dueTime, locale)}` : ""}
            </span>
            <span>{listName}</span>
          </span>
        </span>
      </Link>
    </li>
  );
}
