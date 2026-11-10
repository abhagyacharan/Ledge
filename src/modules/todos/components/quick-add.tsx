"use client";

import { Plus, X } from "lucide-react";
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
import { timeNowIn, todayIn } from "@/lib/dates";
import { createTagAction } from "../actions/tags";
import { createTaskAction } from "../actions/tasks";
import {
  parseQuickAdd,
  tokenKey,
  type ParsedQuickAdd,
  type QuickAddToken,
} from "../quick-add-parser";
import { QUICK_ADD_EVENT } from "./quick-add-button";
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
    const openFromButton = () => setOpen(true);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener(QUICK_ADD_EVENT, openFromButton);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener(QUICK_ADD_EVENT, openFromButton);
    };
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
  const { lists, tags, timeZone, locale } = useTodos();
  const [title, setTitle] = useState("");
  const [ignored, setIgnored] = useState<ReadonlySet<string>>(new Set());
  const [parsed, setParsed] = useState<ParsedQuickAdd>(() =>
    parse("", new Set(), lists, tags, timeZone, locale),
  );
  const [listId, setListId] = useState(defaultListId);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  // A #list in the text wins over the menu; removing its chip gives the menu back.
  const effectiveListId = parsed.listId ?? listId;

  function update(nextTitle: string, nextIgnored: ReadonlySet<string>) {
    setTitle(nextTitle);
    setIgnored(nextIgnored);
    setParsed(parse(nextTitle, nextIgnored, lists, tags, timeZone, locale));
  }

  function removeToken(token: QuickAddToken) {
    update(title, new Set([...ignored, tokenKey(token)]));
    inputRef.current?.focus();
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const value = parsed.title;
    if (!value) return;
    startTransition(async () => {
      // A tag nobody has used yet is created first (or found, if it already exists).
      const newTagIds: string[] = [];
      for (const name of parsed.newTagNames) {
        const tag = await run(createTagAction({ name }));
        if (tag.ok) newTagIds.push(tag.data.id);
      }
      const tagIds = [...parsed.tagIds, ...newTagIds];
      const result = await run(
        createTaskAction({
          listId: effectiveListId,
          title: value,
          ...(parsed.dueDate ? { dueDate: parsed.dueDate, dueTime: parsed.dueTime } : {}),
          ...(parsed.priority !== null ? { priority: parsed.priority } : {}),
          ...(tagIds.length > 0 ? { tagIds } : {}),
        }),
      );
      if (result.ok) {
        const date = parsed.tokens.find((t) => t.kind === "date");
        const where = lists.find((l) => l.id === effectiveListId)?.name ?? "list";
        toast.success(`Added to ${where}${date ? `, due ${date.label.toLowerCase()}` : ""}`);
        update("", new Set());
      }
      inputRef.current?.focus();
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle>Quick add</DialogTitle>
        <DialogDescription>
          Type it as you would say it: dates, #list, @tag and p1 to p3 are picked up. Enter adds the
          task and the box stays open.
        </DialogDescription>
      </DialogHeader>
      <div className="flex flex-col gap-2">
        <Label htmlFor="quick-add-title">Task</Label>
        <Input
          id="quick-add-title"
          ref={inputRef}
          value={title}
          onChange={(e) => update(e.target.value, ignored)}
          maxLength={500}
          autoFocus
          disabled={pending}
          placeholder="pay rent tomorrow 5pm #home @bills p1"
          className="h-11 md:h-8"
        />
        {parsed.tokens.length > 0 ? (
          <ul aria-label="Understood from your text" className="flex flex-wrap gap-2">
            {parsed.tokens.map((token) => (
              <li
                key={tokenKey(token)}
                className="inline-flex items-center rounded-full border bg-accent pl-3 text-sm"
              >
                {token.label}
                <button
                  type="button"
                  aria-label={`Remove ${token.label}`}
                  onClick={() => removeToken(token)}
                  className="grid size-11 place-items-center rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50 md:size-7"
                >
                  <X className="size-3.5" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="quick-add-list">List</Label>
        <Select value={effectiveListId} onValueChange={setListId} disabled={parsed.listId !== null}>
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
      <Button type="submit" className="h-11 md:h-8" disabled={pending || !parsed.title}>
        Add task
      </Button>
    </form>
  );
}

/** Works out "today" in the user's timezone the way the server does, then parses the sentence. */
function parse(
  text: string,
  ignored: ReadonlySet<string>,
  lists: { id: string; name: string }[],
  tags: { id: string; name: string }[],
  timeZone: string,
  locale: string,
): ParsedQuickAdd {
  const now = new Date();
  return parseQuickAdd(text, {
    today: todayIn(timeZone, now),
    timeNow: timeNowIn(timeZone, now),
    locale,
    lists,
    tags,
    ignored,
  });
}
