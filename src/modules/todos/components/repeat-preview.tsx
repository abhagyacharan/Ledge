"use client";

import { Eye } from "lucide-react";
import Link from "next/link";
import { formatTime } from "@/lib/dates";
import { useTaskLinks } from "./use-task-links";

/**
 * A later date of a repeating task, shown ahead in Upcoming (docs/new_design.md screen 2c). It is
 * a read-only preview: a dashed ring, softer text and the words "Preview of a repeat". It opens
 * the real task, which is due on an earlier date.
 */
export function RepeatPreview({
  taskId,
  title,
  dueTime,
  listName,
  locale,
}: {
  taskId: string;
  title: string;
  dueTime?: string | null;
  listName?: string;
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
          <span className="size-5 rounded-full border-[1.5px] border-dashed border-dash-ink-soft/70" />
        </span>
        <span className="min-w-0 py-2">
          <span className="block text-[15px] leading-snug break-words text-dash-ink-soft md:text-sm">
            {title}
          </span>
          <span className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-dash-ink-soft">
            <span className="inline-flex items-center gap-1">
              <Eye aria-hidden className="size-3.5" />
              Preview of a repeat
            </span>
            {dueTime ? <span>{formatTime(dueTime, locale)}</span> : null}
            {listName ? <span>{listName}</span> : null}
          </span>
        </span>
      </Link>
    </li>
  );
}
