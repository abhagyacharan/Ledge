"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Small dialog that asks for a single name (rename a section, add a section). */
export function NameDialog({
  open,
  onOpenChange,
  title,
  label = "Name",
  initial = "",
  submitLabel,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  label?: string;
  initial?: string;
  submitLabel: string;
  /** Return true when saved, so the dialog closes. */
  onSubmit: (name: string) => Promise<boolean>;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {open ? (
          <NameForm
            title={title}
            label={label}
            initial={initial}
            submitLabel={submitLabel}
            onSubmit={onSubmit}
            close={() => onOpenChange(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function NameForm({
  title,
  label,
  initial,
  submitLabel,
  onSubmit,
  close,
}: {
  title: string;
  label: string;
  initial: string;
  submitLabel: string;
  onSubmit: (name: string) => Promise<boolean>;
  close: () => void;
}) {
  const [name, setName] = useState(initial);
  const [pending, startTransition] = useTransition();

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    startTransition(async () => {
      if (await onSubmit(name.trim())) close();
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
      </DialogHeader>
      <div className="flex flex-col gap-2">
        <Label htmlFor="name-dialog-input">{label}</Label>
        <Input
          id="name-dialog-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={100}
          autoFocus
          className="h-11 md:h-8"
        />
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" className="h-11 md:h-8" onClick={close}>
          Cancel
        </Button>
        <Button type="submit" className="h-11 md:h-8" disabled={pending || !name.trim()}>
          {submitLabel}
        </Button>
      </DialogFooter>
    </form>
  );
}
