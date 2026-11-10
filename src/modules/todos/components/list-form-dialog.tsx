"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { List } from "@/server/db/schema";
import { createListAction, updateListAction } from "../actions/lists";
import { ColorPicker } from "./color-picker";
import { run } from "./run-action";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pass a list to edit it; omit to create a new one. */
  list?: List;
};

/** Create or edit a list: name, emoji, colour, description and an optional target date (a goal). */
export function ListFormDialog({ open, onOpenChange, list }: Props) {
  // Remount the form each time the dialog opens so it always starts from the current list.
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {open ? <ListForm list={list} close={() => onOpenChange(false)} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function ListForm({ list, close }: { list?: List; close: () => void }) {
  const router = useRouter();
  const editing = Boolean(list);
  const [name, setName] = useState(list?.name ?? "");
  const [icon, setIcon] = useState(list?.icon ?? "");
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
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle>{editing ? "Edit list" : "New list"}</DialogTitle>
        <DialogDescription>
          A list groups related tasks. Add a target date to treat it as a goal.
        </DialogDescription>
      </DialogHeader>

      {list?.isInbox ? null : (
        <Field id="list-name" label="Name" error={errors.name}>
          <Input
            id="list-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={100}
            autoFocus
            className="h-11 md:h-8"
            aria-invalid={errors.name ? true : undefined}
          />
        </Field>
      )}
      <Field id="list-icon" label="Emoji (optional)" error={errors.icon}>
        <Input
          id="list-icon"
          value={icon}
          onChange={(e) => setIcon(e.target.value)}
          maxLength={16}
          placeholder="🏠"
          className="h-11 w-24 md:h-8"
        />
      </Field>
      <div className="flex flex-col gap-2">
        <Label>Colour</Label>
        <ColorPicker value={color} onChange={setColor} label="List colour" />
      </div>
      <Field id="list-description" label="Description (optional)" error={errors.description}>
        <Textarea
          id="list-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={500}
          rows={2}
        />
      </Field>
      <Field id="list-target" label="Target date (optional)" error={errors.targetDate}>
        <Input
          id="list-target"
          type="date"
          value={targetDate}
          onChange={(e) => setTargetDate(e.target.value)}
          className="h-11 w-48 md:h-8"
        />
      </Field>

      <DialogFooter>
        <Button type="button" variant="outline" className="h-11 md:h-8" onClick={close}>
          Cancel
        </Button>
        <Button type="submit" className="h-11 md:h-8" disabled={pending}>
          {pending ? "Saving…" : editing ? "Save" : "Create list"}
        </Button>
      </DialogFooter>
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
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
