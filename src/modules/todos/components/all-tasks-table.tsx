"use client";

import { Flag, Minus, Search, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { addDaysIso, formatRowDay, formatTime, isOverdue } from "@/lib/dates";
import { describeStored } from "@/lib/recurrence";
import { cn } from "@/lib/utils";
import type { ViewTask } from "@/server/data/views";
import { CheckboxButton, PRIORITY_STYLE, repeatDate, useToggleDone } from "./task-row";
import { PRIORITY_LABELS, type DateContext } from "./types";
import { useTaskLinks } from "./use-task-links";

/**
 * All tasks as a table with a mouse (docs/new_design.md screen 6d): task, list, due, details and
 * priority in columns, with a quick filter by title. Phones keep the list of rows.
 */
export function AllTasksTable({
  tasks,
  allTasks,
  ctx,
}: {
  tasks: ViewTask[];
  allTasks: ViewTask[];
  ctx: DateContext;
}) {
  const [filter, setFilter] = useState("");
  const words = filter.trim().toLowerCase();
  const shown = words ? tasks.filter((t) => t.title.toLowerCase().includes(words)) : tasks;

  return (
    <div className="flex flex-col gap-3">
      <div className="relative max-w-sm">
        <label htmlFor="all-filter" className="sr-only">
          Filter by title
        </label>
        <Search
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-dash-ink-soft"
        />
        <input
          id="all-filter"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter by title"
          className="h-10 w-full rounded-full border border-dash-edge bg-dash-card pr-4 pl-10 text-sm outline-none placeholder:text-dash-ink-soft focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      </div>
      <div className="overflow-hidden rounded-2xl border border-dash-edge bg-dash-card shadow-(--dash-card-shadow)">
        <table className="w-full text-sm">
          <caption className="sr-only">All tasks</caption>
          <thead>
            <tr className="border-b border-dash-edge text-left text-xs text-dash-ink-soft">
              <th scope="col" className="py-3 pr-2 pl-14 font-medium">
                Task
              </th>
              <th scope="col" className="px-2 py-3 font-medium">
                List
              </th>
              <th scope="col" className="px-2 py-3 font-medium">
                Due
              </th>
              <th scope="col" className="px-2 py-3 font-medium">
                Details
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Priority
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-dash-edge">
            {shown.map((t) => (
              <Row
                key={t.id}
                task={t}
                subtasks={allTasks.filter((s) => s.parentId === t.id)}
                ctx={ctx}
              />
            ))}
          </tbody>
        </table>
        {shown.length === 0 ? (
          <p className="px-5 py-6 text-sm text-dash-ink-soft">No task titles match.</p>
        ) : null}
      </div>
    </div>
  );
}

function Row({ task, subtasks, ctx }: { task: ViewTask; subtasks: ViewTask[]; ctx: DateContext }) {
  const { done, toggle, ahead } = useToggleDone(
    task.id,
    task.title,
    task.status === "done",
    repeatDate(task),
  );
  const { hrefFor } = useTaskLinks();
  const late = !done && isOverdue(task, ctx.today, ctx.timeNow);
  const time = task.dueTime ? formatTime(task.dueTime, ctx.locale) : null;
  const day = !task.dueDate
    ? null
    : task.dueDate === ctx.today
      ? "Today"
      : task.dueDate === addDaysIso(ctx.today, 1)
        ? "Tomorrow"
        : formatRowDay(task.dueDate, ctx.today, ctx.locale);
  const subDone = subtasks.filter((s) => s.status === "done").length;
  const repeat = describeStored(
    task.recurrenceRule,
    task.recurrenceMode,
    task.recurrenceUntil,
    ctx.locale,
  );
  const details = late
    ? "Overdue"
    : subtasks.length > 0
      ? `${subDone}/${subtasks.length} subtasks`
      : (repeat ?? "");

  return (
    <tr className="group/row transition-colors duration-150 hover:bg-dash-well/60">
      <td className="py-1 pr-2 pl-2">
        <div className="flex items-center gap-1">
          <CheckboxButton
            title={task.title}
            done={done}
            onToggle={toggle}
            priority={task.priority}
            ahead={ahead}
          />
          <Link
            href={hrefFor(task.id)}
            scroll={false}
            data-task-link
            className={cn(
              "min-w-0 rounded-md py-2 font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
              done && "text-dash-ink-soft line-through",
            )}
          >
            {task.title}
          </Link>
        </div>
      </td>
      <td className="px-2 text-dash-ink-soft">{task.listName}</td>
      <td
        className={cn(
          "px-2 whitespace-nowrap",
          late ? "font-semibold text-dash-bad" : !day && "text-dash-ink-soft",
        )}
      >
        {late ? <TriangleAlert aria-hidden className="mr-1 inline size-3.5 align-[-2px]" /> : null}
        {day ? (time ? `${day}, ${time}` : day) : "No date"}
      </td>
      <td className="px-2 text-dash-ink-soft">{details}</td>
      <td
        className={cn(
          "px-4 whitespace-nowrap",
          task.priority > 0 ? `font-medium ${PRIORITY_STYLE[task.priority]}` : "text-dash-ink-soft",
        )}
      >
        {task.priority > 0 ? (
          <Flag aria-hidden className="mr-1 inline size-3.5 align-[-2px]" />
        ) : (
          <Minus aria-hidden className="mr-1 inline size-3.5 align-[-2px]" />
        )}
        {PRIORITY_LABELS[task.priority]}
      </td>
    </tr>
  );
}
