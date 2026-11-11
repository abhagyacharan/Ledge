"use client";

import { Plus, SlidersHorizontal } from "lucide-react";
import { useRef, useState, useTransition, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createTaskAction } from "../actions/tasks";
import { QUICK_ADD_EVENT, type QuickAddPrefill } from "./quick-add-button";
import { run } from "./run-action";

/**
 * Inline "add a task" field at the bottom of a list or section (CLAUDE.md §6.2).
 * Enter adds the task and keeps the field focused for the next one.
 */
export function InlineAdd({
  listId,
  sectionId = null,
  parentId = null,
  dueDate = null,
  tagIds,
  label = "Add a task",
}: {
  listId: string;
  sectionId?: string | null;
  /** Set to add a subtask under this task. */
  parentId?: string | null;
  /** Give new tasks this due date (used by Today and Upcoming). */
  dueDate?: string | null;
  /** Give new tasks these tags (used by the Tag view). */
  tagIds?: string[];
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
      const result = await run(
        createTaskAction({ listId, sectionId, parentId, dueDate, tagIds, title: value }),
      );
      if (result.ok) setTitle("");
      inputRef.current?.focus();
    });
  }

  // The full form (date, priority, tags, notes, repeat) with what is typed so far.
  function openFullForm() {
    const detail: QuickAddPrefill = {
      title,
      listId,
      sectionId,
      dueDate,
      tagIds,
    };
    window.dispatchEvent(new CustomEvent(QUICK_ADD_EVENT, { detail }));
    setTitle("");
  }

  return (
    <form onSubmit={onSubmit} className="flex items-center gap-1 py-1">
      <span className="flex size-11 shrink-0 items-center justify-center text-muted-foreground md:size-8">
        <Plus className="size-4" aria-hidden />
      </span>
      <Input
        ref={inputRef}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder={label}
        aria-label={label}
        maxLength={500}
        disabled={pending}
        className="h-11 border-transparent bg-transparent shadow-none focus-visible:border-ring md:h-8"
      />
      {parentId ? null : (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-11 shrink-0 text-muted-foreground md:size-8"
          aria-label={`More options: open the full form`}
          title="More options"
          onClick={openFullForm}
        >
          <SlidersHorizontal aria-hidden />
        </Button>
      )}
    </form>
  );
}
