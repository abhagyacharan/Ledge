"use client";

import { Plus } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, useTransition, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createTaskAction } from "../actions/tasks";
import { run } from "./run-action";
import { useTodos } from "./todos-provider";

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) ||
    target.getAttribute("role") === "combobox"
  );
}

/**
 * Quick add (CLAUDE.md §6.2): a button that is always reachable, and the `q` key.
 * Enter adds the task and the field stays open for the next one.
 */
export function QuickAdd() {
  const { lists, inboxId } = useTodos();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Default to the list being viewed, otherwise the Inbox.
  const viewed = /^\/lists\/([0-9a-f-]{36})/.exec(pathname)?.[1];
  const defaultListId = lists.some((l) => l.id === viewed) ? (viewed as string) : inboxId;

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "q" || event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTypingTarget(event.target) || document.querySelector("[role=dialog]")) return;
      event.preventDefault();
      setOpen(true);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <>
      <Button
        type="button"
        size="icon"
        aria-label="Quick add task (shortcut: q)"
        title="Quick add (q)"
        onClick={() => setOpen(true)}
        className="fixed right-4 bottom-4 z-30 size-14 rounded-full shadow-lg md:size-12"
      >
        <Plus className="size-6" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          {open ? <QuickAddForm defaultListId={defaultListId} /> : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

function QuickAddForm({ defaultListId }: { defaultListId: string }) {
  const { lists } = useTodos();
  const [title, setTitle] = useState("");
  const [listId, setListId] = useState(defaultListId);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const value = title.trim();
    if (!value) return;
    startTransition(async () => {
      const result = await run(createTaskAction({ listId, title: value }));
      if (result.ok) {
        setTitle("");
        toast.success(`Added to ${lists.find((l) => l.id === listId)?.name ?? "list"}`);
      }
      inputRef.current?.focus();
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle>Quick add</DialogTitle>
        <DialogDescription>
          Press Enter to add. The box stays open for the next task.
        </DialogDescription>
      </DialogHeader>
      <div className="flex flex-col gap-2">
        <Label htmlFor="quick-add-title">Task</Label>
        <Input
          id="quick-add-title"
          ref={inputRef}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={500}
          autoFocus
          disabled={pending}
          placeholder="What needs doing?"
          className="h-11 md:h-8"
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="quick-add-list">List</Label>
        <Select value={listId} onValueChange={setListId}>
          <SelectTrigger id="quick-add-list" className="h-11 w-full md:h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {lists.map((l) => (
              <SelectItem key={l.id} value={l.id}>
                {l.icon ? `${l.icon} ` : ""}
                {l.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" className="h-11 md:h-8" disabled={pending || !title.trim()}>
        Add task
      </Button>
    </form>
  );
}
