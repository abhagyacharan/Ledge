"use client";

import { Repeat } from "lucide-react";
import Link from "next/link";
import { useTaskLinks } from "./use-task-links";

/**
 * A later date of a repeating task, shown ahead in Upcoming (CLAUDE.md §6.2, Recurring tasks). It is a preview, not a task of its own: there is no
 * checkbox, and it opens the real task, which is due on an earlier date.
 */
export function RepeatPreview({
  taskId,
  title,
  repeatText,
}: {
  taskId: string;
  title: string;
  repeatText: string;
}) {
  const { hrefFor } = useTaskLinks();
  return (
    <li className="-mx-2 rounded-xl px-1 transition-colors duration-150 hover:bg-dash-well/70">
      <Link
        href={hrefFor(taskId)}
        scroll={false}
        className="flex min-h-11 items-center gap-3 rounded-lg px-1.5 py-2 outline-none focus-visible:ring-3 focus-visible:ring-ring/50 md:min-h-9"
      >
        <span
          aria-hidden
          className="grid size-6 shrink-0 place-items-center rounded-full border border-dashed border-dash-ink-soft/60 text-dash-ink-soft"
        >
          <Repeat className="size-3" />
        </span>
        <span className="min-w-0">
          <span className="block text-[15px] leading-snug break-words text-dash-ink md:text-sm">
            {title}
          </span>
          <span className="block text-[13px] text-dash-ink-soft">
            {repeatText}. Comes back on this day.
          </span>
        </span>
      </Link>
    </li>
  );
}
