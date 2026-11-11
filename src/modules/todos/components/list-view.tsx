"use client";

import { ListTodo } from "lucide-react";
import { useState } from "react";
import { EmptyState } from "@/components/shell/empty-state";
import type { List } from "@/server/db/schema";
import type { TaskRow as TaskRowData } from "@/server/data/tasks";
import { setListViewSettingsAction } from "../actions/lists";
import { applyView, filterTasks } from "../view-logic";
import { DEFAULT_VIEW_SETTINGS, type ViewSettings } from "../view-settings";
import { InlineAdd } from "./inline-add";
import { ListHeader } from "./list-header";
import { ManualBoard } from "./manual-board";
import { run } from "./run-action";
import { TaskGroup, TaskPanel } from "./task-panel";
import { TaskRow } from "./task-row";
import type { DateContext } from "./types";
import { ViewControls } from "./view-controls";

type Props = {
  list: List;
  tasks: TaskRowData[];
  ctx: DateContext;
  /** Saved in `lists.view_settings`. */
  settings: ViewSettings;
};

/**
 * A list screen (docs/design.md §5f): the list's header card, then one card with its tasks. In
 * manual order with no grouping the tasks can be dragged; any other sort or grouping shows a
 * grouped list instead. The view choices are saved per list.
 */
export function ListView({ list, tasks, ctx, settings: saved }: Props) {
  // Show a change at once, then follow whatever the server sends back after saving.
  const [seen, setSeen] = useState(saved);
  const [settings, setSettings] = useState(saved);
  if (saved !== seen) {
    setSeen(saved);
    setSettings(saved);
  }

  async function change(next: ViewSettings) {
    const previous = settings;
    setSettings(next);
    const result = await run(setListViewSettingsAction({ id: list.id, settings: next }));
    if (!result.ok) setSettings(previous);
  }

  const topLevel = tasks.filter((t) => !t.parentId);
  const subtasksOf = (id: string) => tasks.filter((t) => t.parentId === id);
  const doneCount = topLevel.filter((t) => t.status === "done").length;
  const visible = filterTasks(topLevel, settings);
  const manual = settings.sort === "manual" && settings.group === "none";
  const filtersHideEverything = visible.length === 0 && topLevel.length > doneCount;

  // The drag board remounts with fresh state whenever the saved order changes.
  const boardKey = visible.map((t) => `${t.id}:${t.position}:${t.status}`).join(",");

  return (
    <div className="flex flex-col gap-4">
      <ListHeader list={list} taskCount={topLevel.length} doneCount={doneCount} ctx={ctx} />

      <TaskPanel
        id="list-tasks"
        title="Tasks"
        action={
          <div className="flex flex-wrap items-center gap-2">
            {doneCount > 0 ? (
              <button
                type="button"
                aria-pressed={settings.showCompleted}
                onClick={() => void change({ ...settings, showCompleted: !settings.showCompleted })}
                className="h-11 rounded-full px-3.5 text-[13px] font-medium text-dash-ink-soft outline-none transition-colors duration-150 hover:bg-dash-well hover:text-dash-ink focus-visible:ring-3 focus-visible:ring-ring/50 md:h-9"
              >
                {settings.showCompleted ? "Hide" : "Show"} {doneCount} completed
              </button>
            ) : null}
            <ViewControls settings={settings} allowManual onChange={(next) => void change(next)} />
          </div>
        }
      >
        {topLevel.length === 0 ? (
          <EmptyState
            icon={ListTodo}
            title="No tasks yet"
            hint="Type one below and press Enter, or use the + button."
          />
        ) : null}

        {filtersHideEverything ? (
          <EmptyState
            title="No tasks match this view"
            action={
              <button
                type="button"
                className="text-sm font-medium underline underline-offset-4"
                onClick={() => void change(DEFAULT_VIEW_SETTINGS)}
              >
                Reset view
              </button>
            }
          />
        ) : null}

        {manual ? (
          <ManualBoard
            key={boardKey}
            listId={list.id}
            tasks={visible}
            subtasksOf={subtasksOf}
            ctx={ctx}
          />
        ) : (
          <>
            <p className="mb-2 text-xs text-dash-ink-soft">
              Dragging works in manual order with no grouping.{" "}
              <button
                type="button"
                className="font-medium text-dash-ink underline underline-offset-4"
                onClick={() => void change({ ...settings, sort: "manual", group: "none" })}
              >
                Back to manual order
              </button>
            </p>
            {applyView(topLevel, settings, ctx).map((group) =>
              group.label ? (
                <TaskGroup
                  key={group.key}
                  id={`list-group-${group.key.replace(/\s+/g, "-").toLowerCase()}`}
                  label={group.label}
                  count={group.tasks.length}
                  tone={group.key === "Overdue" ? "bad" : undefined}
                >
                  <ul>
                    {group.tasks.map((t) => (
                      <TaskRow key={t.id} task={t} subtasks={subtasksOf(t.id)} ctx={ctx} />
                    ))}
                  </ul>
                </TaskGroup>
              ) : (
                <ul key={group.key}>
                  {group.tasks.map((t) => (
                    <TaskRow key={t.id} task={t} subtasks={subtasksOf(t.id)} ctx={ctx} />
                  ))}
                </ul>
              ),
            )}
          </>
        )}

        <InlineAdd listId={list.id} />
      </TaskPanel>
    </div>
  );
}
