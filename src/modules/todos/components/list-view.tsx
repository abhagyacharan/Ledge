"use client";

import { ListTodo } from "lucide-react";
import { AnimatePresence } from "motion/react";
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
function Kbd({ children }: { children: string }) {
  return (
    <kbd className="rounded-[5px] bg-dash-well px-1.5 py-0.5 font-mono text-[11px] font-medium text-dash-ink">
      {children}
    </kbd>
  );
}

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
    <div className="flex flex-col gap-3 md:gap-4">
      <ListHeader list={list} taskCount={topLevel.length} doneCount={doneCount} ctx={ctx} />

      <ViewControls
        settings={settings}
        allowManual
        onChange={(next) => void change(next)}
        savedNote="Saved for this list"
      />

      <TaskPanel id="list-tasks" title="Tasks" hideTitle className="px-3 py-2 md:px-4 md:py-3">
        {topLevel.length === 0 ? (
          <EmptyState
            icon={ListTodo}
            title="This list is empty"
            hint="Add the first task, or press Q."
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
                    <AnimatePresence initial={false}>
                      {group.tasks.map((t) => (
                        <TaskRow key={t.id} task={t} subtasks={subtasksOf(t.id)} ctx={ctx} />
                      ))}
                    </AnimatePresence>
                  </ul>
                </TaskGroup>
              ) : (
                <ul key={group.key}>
                  <AnimatePresence initial={false}>
                    {group.tasks.map((t) => (
                      <TaskRow key={t.id} task={t} subtasks={subtasksOf(t.id)} ctx={ctx} />
                    ))}
                  </AnimatePresence>
                </ul>
              ),
            )}
          </>
        )}

        <div className="mt-1 border-t border-dash-edge">
          <InlineAdd listId={list.id} label={`Add to ${list.name}`} />
        </div>
      </TaskPanel>

      <p
        aria-hidden
        className="hidden flex-wrap items-center gap-x-4 gap-y-1 px-1 text-xs text-dash-ink-soft md:flex"
      >
        <span>
          <Kbd>J</Kbd> <Kbd>K</Kbd> move
        </span>
        <span>
          <Kbd>X</Kbd> complete
        </span>
        <span>
          <Kbd>E</Kbd> edit title
        </span>
        <span>
          <Kbd>Enter</Kbd> open
        </span>
        <span>
          <Kbd>?</Kbd> all shortcuts
        </span>
      </p>
    </div>
  );
}
