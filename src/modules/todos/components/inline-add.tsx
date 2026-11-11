"use client";

import { Plus, SlidersHorizontal } from "lucide-react";
import { useRef, useState, useTransition, type FormEvent } from "react";
import { createTaskAction } from "../actions/tasks";
import { QUICK_ADD_EVENT, type QuickAddPrefill } from "./quick-add-button";
import { run } from "./run-action";

/**
 * Inline "Add a task" row at the bottom of a list or view (CLAUDE.md §6.2). Enter adds the task
 * and keeps the field focused for the next one; the sliders button opens the full form with what
 * is typed so far.
 */
export function InlineAdd({
  listId,
  parentId = null,
  dueDate = null,
  label = "Add a task",
}: {
  listId: string;
  /** Set to add a subtask under this task. */
  parentId?: string | null;
  /** Give new tasks this due date (used by Today and Upcoming). */
  dueDate?: string | null;
  label?: string;
}) {
  const [title, setTitle] = useState("");
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const value = title.trim();
    if (!value) return;
    startTransition(async () => {
      const result = await run(createTaskAction({ listId, parentId, dueDate, title: value }));
      if (result.ok) setTitle("");
      inputRef.current?.focus();
    });
  }

  function openFullForm() {
    const detail: QuickAddPrefill = { title, listId, dueDate };
    window.dispatchEvent(new CustomEvent(QUICK_ADD_EVENT, { detail }));
    setTitle("");
  }

  return (
    <form
      onSubmit={onSubmit}
      className="group/add -mx-2 mt-1 flex items-center gap-0.5 rounded-xl px-1 transition-colors duration-150 focus-within:bg-dash-well/70"
    >
      <span className="grid size-11 shrink-0 place-items-center text-dash-ink-soft md:size-9">
        <span className="grid size-5 place-items-center rounded-full border-[1.5px] border-dashed border-dash-ink-soft/60">
          <Plus className="size-3" aria-hidden strokeWidth={2.5} />
        </span>
      </span>
      <input
        ref={inputRef}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder={label}
        aria-label={label}
        maxLength={500}
        disabled={pending}
        enterKeyHint="enter"
        className="h-11 min-w-0 flex-1 rounded-lg bg-transparent px-1 text-base text-dash-ink outline-none placeholder:text-dash-ink-soft focus-visible:ring-3 focus-visible:ring-ring/50 md:h-9 md:text-sm"
      />
      {parentId ? null : (
        <button
          type="button"
          aria-label="More options: open the full form"
          title="More options"
          onClick={openFullForm}
          className="grid size-11 shrink-0 place-items-center rounded-full text-dash-ink-soft outline-none transition-colors duration-150 hover:bg-dash-raised hover:text-dash-ink focus-visible:ring-3 focus-visible:ring-ring/50 md:size-9"
        >
          <SlidersHorizontal aria-hidden className="size-4" />
        </button>
      )}
    </form>
  );
}
