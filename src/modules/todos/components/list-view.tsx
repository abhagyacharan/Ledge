"use client";

import { Columns3, List as ListIcon, Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { List, Section, Tag } from "@/server/db/schema";
import type { TaskRow as TaskRowData } from "@/server/data/tasks";
import { setListViewModeAction, setListViewSettingsAction } from "../actions/lists";
import { createSectionAction } from "../actions/sections";
import { applyView, filterTasks } from "../view-logic";
import { DEFAULT_VIEW_SETTINGS, type ViewSettings } from "../view-settings";
import { InlineAdd } from "./inline-add";
import { ListHeader } from "./list-header";
import { ManualBoard } from "./manual-board";
import { NameDialog } from "./name-dialog";
import { run } from "./run-action";
import { TaskRow } from "./task-row";
import type { DateContext, TagsById } from "./types";
import { ViewControls } from "./view-controls";

type Props = {
  list: List;
  sections: Section[];
  tasks: TaskRowData[];
  tags: Tag[];
  tagsById: TagsById;
  ctx: DateContext;
  /** Saved in `lists.view_settings`. */
  settings: ViewSettings;
};

/**
 * A list screen: header, view controls, then the tasks. With manual order and no grouping the
 * tasks sit in their sections and can be dragged. Any other sort or grouping shows a flat,
 * grouped list instead (sections are only shown in manual order). The choices are saved per list.
 */
export function ListView({ list, sections, tasks, tags, tagsById, ctx, settings: saved }: Props) {
  // Show a change at once, then follow whatever the server sends back after saving.
  const [seen, setSeen] = useState(saved);
  const [settings, setSettings] = useState(saved);
  if (saved !== seen) {
    setSeen(saved);
    setSettings(saved);
  }
  const [addingSection, setAddingSection] = useState(false);

  // The list or board choice is remembered per list; it also shows at once.
  const [savedMode, setSavedMode] = useState(list.viewMode);
  const [mode, setMode] = useState(list.viewMode);
  if (list.viewMode !== savedMode) {
    setSavedMode(list.viewMode);
    setMode(list.viewMode);
  }
  const asBoard = mode === "board";

  async function changeMode(next: "list" | "board") {
    if (next === mode) return;
    const previous = mode;
    setMode(next);
    const result = await run(setListViewModeAction({ id: list.id, mode: next }));
    if (!result.ok) setMode(previous);
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
  // The board always uses manual order: its columns are the sections.
  const manual = asBoard || (settings.sort === "manual" && settings.group === "none");
  const filtersHideEverything = visible.length === 0 && topLevel.length > doneCount;

  // The drag board remounts with fresh state whenever the saved order changes.
  const boardKey = [
    mode,
    "|",
    ...sections.map((s) => s.id),
    "|",
    ...visible.map((t) => `${t.id}:${t.sectionId}:${t.position}:${t.status}`),
  ].join(",");

  return (
    <div>
      <ListHeader list={list} taskCount={topLevel.length} ctx={ctx} />

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <ViewControls
          settings={settings}
          tags={tags}
          allowManual
          onChange={(next) => void change(next)}
        />
        <div role="group" aria-label="Layout" className="inline-flex rounded-lg border p-0.5">
          <Button
            variant={asBoard ? "ghost" : "secondary"}
            className="h-11 gap-1.5 px-3 md:h-7"
            aria-pressed={!asBoard}
            aria-label="List view"
            onClick={() => void changeMode("list")}
          >
            <ListIcon aria-hidden /> List
          </Button>
          <Button
            variant={asBoard ? "secondary" : "ghost"}
            className="h-11 gap-1.5 px-3 md:h-7"
            aria-pressed={asBoard}
            aria-label="Board view"
            onClick={() => void changeMode("board")}
          >
            <Columns3 aria-hidden /> Board
          </Button>
        </div>
        {doneCount > 0 ? (
          <Button
            variant="ghost"
            className="h-11 text-muted-foreground md:h-8"
            aria-pressed={settings.showCompleted}
            onClick={() => void change({ ...settings, showCompleted: !settings.showCompleted })}
          >
            {settings.showCompleted ? "Hide" : "Show"} {doneCount} completed
          </Button>
        ) : null}
      </div>

      {asBoard && (settings.sort !== "manual" || settings.group !== "none") ? (
        <p className="mb-3 text-xs text-muted-foreground">
          The board shows tasks in manual order, one column per section. Sort and group apply to the
          list view.
        </p>
      ) : null}

      {topLevel.length === 0 && sections.length === 0 ? (
        <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
          No tasks yet. Type one below and press Enter.
        </p>
      ) : null}

      {filtersHideEverything ? (
        <p className="mb-3 rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
          No tasks match this view.{" "}
          <button
            type="button"
            className="underline underline-offset-4"
            onClick={() => void change(DEFAULT_VIEW_SETTINGS)}
          >
            Reset view
          </button>
        </p>
      ) : null}

      {manual ? (
        <ManualBoard
          key={boardKey}
          listId={list.id}
          sections={sections}
          tasks={visible}
          subtasksOf={subtasksOf}
          tagsById={tagsById}
          ctx={ctx}
          layout={asBoard ? "columns" : "stack"}
        />
      ) : (
        <>
          <p className="mb-3 text-xs text-muted-foreground">
            Sections and dragging are available when sorted manually with no grouping.{" "}
            <button
              type="button"
              className="underline underline-offset-4"
              onClick={() => void change({ ...settings, sort: "manual", group: "none" })}
            >
              Back to manual order
            </button>
          </p>
          {applyView(topLevel, settings, ctx, tagsById).map((group) => (
            <section key={group.key} className="mb-4" aria-label={group.label || "Tasks"}>
              {group.label ? (
                <h2 className="mb-1 border-b pb-1 text-sm font-semibold">
                  {group.label}{" "}
                  <span className="font-normal text-muted-foreground">{group.tasks.length}</span>
                </h2>
              ) : null}
              <ul>
                {group.tasks.map((t) => (
                  <TaskRow
                    key={`${group.key}:${t.id}`}
                    task={t}
                    subtasks={subtasksOf(t.id)}
                    tagsById={tagsById}
                    ctx={ctx}
                  />
                ))}
              </ul>
            </section>
          ))}
          <InlineAdd listId={list.id} />
        </>
      )}

      {manual ? (
        <div className="mt-6">
          <Button
            variant="ghost"
            className="h-11 gap-1 text-muted-foreground md:h-8"
            onClick={() => setAddingSection(true)}
          >
            <Plus /> Add section
          </Button>
        </div>
      ) : null}

      <NameDialog
        open={addingSection}
        onOpenChange={setAddingSection}
        title="New section"
        submitLabel="Add section"
        onSubmit={async (name) => (await run(createSectionAction({ listId: list.id, name }))).ok}
      />
    </div>
  );
}
