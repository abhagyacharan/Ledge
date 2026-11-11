"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent, type ReactNode } from "react";
import { DashButton } from "@/components/dash/dash-button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { List } from "@/server/db/schema";
import { createListAction, updateListAction } from "../actions/lists";
import { LIST_ICONS, ListGlyph } from "../list-icons";
import { ColorPicker } from "./color-picker";
import { run } from "./run-action";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pass a list to edit it; omit to create a new one. */
  list?: List;
};

/** Text fields in the dashboard look (16px text on phones so iOS does not zoom in). */
const field =
  "h-11 w-full rounded-xl border border-dash-edge bg-dash-card px-3.5 text-base text-dash-ink outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-dash-ink-soft focus-visible:border-dash-ink/40 focus-visible:ring-3 focus-visible:ring-ring/40 aria-invalid:border-dash-bad md:h-10 md:text-sm";

/**
 * Create or edit a list (docs/design.md §5f): a live preview of its icon and colour beside the
 * name, one-tap line icons (never colour emojis), colour swatches, a description and an optional
 * target date (a goal).
 */
export function ListFormDialog({ open, onOpenChange, list }: Props) {
  // Remount the form each time the dialog opens so it always starts from the current list.
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="dash sm:max-w-md">
        {open ? <ListForm list={list} close={() => onOpenChange(false)} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function ListForm({ list, close }: { list?: List; close: () => void }) {
  const router = useRouter();
  const editing = Boolean(list);
  const [name, setName] = useState(list?.name ?? "");
  const [icon, setIcon] = useState(
    LIST_ICONS.some((i) => i.key === list?.icon) ? (list?.icon ?? "") : "",
  );
  const [color, setColor] = useState<string | null>(list?.color ?? null);
  const [description, setDescription] = useState(list?.description ?? "");
  const [targetDate, setTargetDate] = useState(list?.targetDate ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const fields = {
        icon,
        color,
        description,
        targetDate: targetDate || null,
        ...(list?.isInbox ? {} : { name }),
      };
      if (list) {
        const result = await run(updateListAction({ id: list.id, ...fields }));
        if (!result.ok) return setErrors(result.fieldErrors ?? {});
        close();
        return;
      }
      const result = await run(createListAction(fields));
      if (!result.ok) return setErrors(result.fieldErrors ?? {});
      close();
      router.push(`/lists/${result.data.id}`);
    });
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      <DialogHeader className="pr-10">
        <DialogTitle className="text-lg font-semibold">
          {editing ? "Edit list" : "New list"}
        </DialogTitle>
        <DialogDescription className="text-[13px] text-dash-ink-soft">
          A list groups related tasks. Add a target date to treat it as a goal.
        </DialogDescription>
      </DialogHeader>

      {/* The list as it will look: its icon (on a tint of its colour) beside its name. */}
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className="grid size-14 shrink-0 place-items-center rounded-2xl bg-dash-well text-dash-ink transition-colors duration-150"
          style={
            color
              ? { backgroundColor: `color-mix(in oklab, ${color} 18%, transparent)` }
              : undefined
          }
        >
          <ListGlyph icon={icon} className="size-6" />
        </span>
        {list?.isInbox ? (
          <p className="font-display text-xl font-semibold tracking-tight">{list.name}</p>
        ) : (
          <div className="min-w-0 flex-1">
            <label htmlFor="list-name" className="sr-only">
              Name
            </label>
            <input
              id="list-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              autoFocus
              placeholder="List name"
              aria-invalid={errors.name ? true : undefined}
              aria-describedby={errors.name ? "list-name-error" : undefined}
              className="h-14 w-full rounded-2xl bg-dash-well px-4 text-lg text-dash-ink outline-none transition-shadow duration-150 placeholder:text-dash-ink-soft/70 focus-visible:ring-3 focus-visible:ring-ring/40 aria-invalid:ring-2 aria-invalid:ring-dash-bad"
            />
            <FieldError id="list-name-error" error={errors.name} />
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <span id="list-icon-label" className="text-[13px] font-medium">
          Icon
        </span>
        <div role="group" aria-labelledby="list-icon-label" className="flex flex-wrap gap-1.5">
          {LIST_ICONS.map((choice) => (
            <button
              key={choice.key}
              type="button"
              aria-pressed={icon === choice.key}
              aria-label={choice.label}
              title={choice.label}
              onClick={() => setIcon(icon === choice.key ? "" : choice.key)}
              className={cn(
                "grid size-11 place-items-center rounded-xl text-dash-ink outline-none transition-[transform,background-color,box-shadow] duration-150 ease-snap focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-95 md:size-10",
                icon === choice.key
                  ? "bg-dash-card shadow-[0_0_0_2px_var(--dash-ink)]"
                  : "bg-dash-well hover:bg-dash-edge",
              )}
            >
              <choice.icon aria-hidden className="size-[18px]" strokeWidth={1.85} />
            </button>
          ))}
        </div>
        <FieldError id="list-icon-error" error={errors.icon} />
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-[13px] font-medium">Colour</span>
        <ColorPicker value={color} onChange={setColor} label="List colour" />
      </div>

      <Field id="list-description" label="Description (optional)" error={errors.description}>
        <textarea
          id="list-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={500}
          rows={2}
          placeholder="What this list is for"
          className={cn(field, "h-auto min-h-18 resize-y py-2.5 leading-relaxed")}
        />
      </Field>

      <Field id="list-target" label="Target date (optional)" error={errors.targetDate}>
        <input
          id="list-target"
          type="date"
          value={targetDate}
          onChange={(e) => setTargetDate(e.target.value)}
          className={cn(field, "sm:w-52")}
        />
      </Field>

      <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
        <DashButton variant="secondary" className="max-sm:h-11" onClick={close}>
          Cancel
        </DashButton>
        <DashButton type="submit" className="max-sm:h-11" disabled={pending}>
          {pending ? "Saving…" : editing ? "Save" : "Create list"}
        </DashButton>
      </div>
    </form>
  );
}

function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[13px] font-medium">
        {label}
      </label>
      {children}
      <FieldError id={`${id}-error`} error={error} />
    </div>
  );
}

function FieldError({ id, error }: { id: string; error?: string }) {
  if (!error) return null;
  return (
    <p id={id} role="alert" className="mt-1 text-[13px] font-medium text-dash-bad">
      {error}
    </p>
  );
}
