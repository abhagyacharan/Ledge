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
import { Textarea } from "@/components/ui/textarea";
import { timeNowIn, todayIn } from "@/lib/dates";
import type { RecurrenceMode } from "@/lib/recurrence";
import { createTagAction } from "../actions/tags";
import { createTaskAction } from "../actions/tasks";
import {
  parseQuickAdd,
  tokenKey,
  type ParsedQuickAdd,
  type QuickAddToken,
} from "../quick-add-parser";
import { DueDateField } from "./due-date-field";
import { QUICK_ADD_EVENT, type QuickAddPrefill } from "./quick-add-button";
import { RepeatField, type RepeatChange } from "./repeat-field";
import { run } from "./run-action";
import { TagField } from "./tag-field";
import { useTodos } from "./todos-provider";
import { PRIORITY_LABELS, type DateContext } from "./types";

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
 * Enter adds the task and the field stays open for the next one. The form has every field a task
 * has (due date and time, priority, list, tags, notes, repeat), and understands a typed sentence.
 */
export function QuickAdd() {
  const { lists, inboxId } = useTodos();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [prefill, setPrefill] = useState<QuickAddPrefill>({});
  // A new key starts the form fresh each time it is opened.
  const [openCount, setOpenCount] = useState(0);

  // Default to the list being viewed, otherwise the Inbox.
  const viewed = /^\/lists\/([0-9a-f-]{36})/.exec(pathname)?.[1];
  const defaultListId = lists.some((l) => l.id === viewed) ? (viewed as string) : inboxId;

  function show(next: QuickAddPrefill = {}) {
    setPrefill(next);
    setOpenCount((n) => n + 1);
    setOpen(true);
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "q" || event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTypingTarget(event.target) || document.querySelector("[role=dialog]")) return;
      event.preventDefault();
      show();
    }
    const openFromButton = (event: Event) => show((event as CustomEvent<QuickAddPrefill>).detail);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener(QUICK_ADD_EVENT, openFromButton);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener(QUICK_ADD_EVENT, openFromButton);
    };
  }, []);

  return (
    <>
      {/* On expense screens the round button logs a transaction instead; q still adds a task. */}
      {pathname.startsWith("/expenses") ? null : (
        <Button
          type="button"
          size="icon"
          aria-label="Quick add task (shortcut: q)"
          title="Quick add (q)"
          onClick={() => show()}
          className="fixed right-4 bottom-4 z-30 size-14 rounded-full shadow-lg md:size-12"
        >
          <Plus className="size-6" />
        </Button>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[92svh] overflow-y-auto sm:max-w-lg">
          {open ? (
            <QuickAddForm
              key={openCount}
              prefill={prefill}
              defaultListId={prefill.listId ?? defaultListId}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

type Due = { dueDate: string | null; dueTime: string | null };

function QuickAddForm({
  prefill,
  defaultListId,
}: {
  prefill: QuickAddPrefill;
  defaultListId: string;
}) {
  const { lists, tags, timeZone, locale, weekStartsOn } = useTodos();
  const [dateCtx] = useState<DateContext>(() => {
    const now = new Date();
    return {
      today: todayIn(timeZone, now),
      timeNow: timeNowIn(timeZone, now),
      locale,
      weekStartsOn,
    };
  });

  const [title, setTitle] = useState(prefill.title ?? "");
  const [ignored, setIgnored] = useState<ReadonlySet<string>>(new Set());
  const [parsed, setParsed] = useState<ParsedQuickAdd>(() =>
    parse(prefill.title ?? "", new Set(), lists, tags, timeZone, locale),
  );
  const [listId, setListId] = useState(defaultListId);
  // Choices made with the controls win over what was understood from the sentence.
  const [manualDue, setManualDue] = useState<Due | null>(
    prefill.dueDate ? { dueDate: prefill.dueDate, dueTime: null } : null,
  );
  const [manualPriority, setManualPriority] = useState<number | null>(null);
  const [tagIds, setTagIds] = useState<string[]>(prefill.tagIds ?? []);
  const [notes, setNotes] = useState("");
  const [repeatRule, setRepeatRule] = useState<string | null>(null);
  const [repeatMode, setRepeatMode] = useState<RecurrenceMode>("fixed");
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  // A #list in the text wins over the menu; removing its chip gives the menu back.
  const effectiveListId = parsed.listId ?? listId;
  const due: Due = manualDue ?? { dueDate: parsed.dueDate, dueTime: parsed.dueTime };
  const priority = manualPriority ?? parsed.priority ?? 0;

  function update(nextTitle: string, nextIgnored: ReadonlySet<string>) {
    setTitle(nextTitle);
    setIgnored(nextIgnored);
    setParsed(parse(nextTitle, nextIgnored, lists, tags, timeZone, locale));
  }

  function removeToken(token: QuickAddToken) {
    update(title, new Set([...ignored, tokenKey(token)]));
    inputRef.current?.focus();
  }

  function changeDue(next: Due) {
    setManualDue(next);
    if (next.dueDate === null) setRepeatRule(null); // nothing to repeat from
  }

  function changeRepeat(change: RepeatChange) {
    if (change.recurrenceRule !== undefined) setRepeatRule(change.recurrenceRule);
    if (change.recurrenceMode) setRepeatMode(change.recurrenceMode);
    if (change.dueDate) setManualDue({ dueDate: change.dueDate, dueTime: due.dueTime });
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
      const allTagIds = [...new Set([...tagIds, ...parsed.tagIds, ...newTagIds])];
      const result = await run(
        createTaskAction({
          listId: effectiveListId,
          sectionId: prefill.sectionId ?? null,
          title: value,
          notes,
          priority,
          ...(due.dueDate ? { dueDate: due.dueDate, dueTime: due.dueTime } : {}),
          ...(allTagIds.length > 0 ? { tagIds: allTagIds } : {}),
          ...(repeatRule && due.dueDate
            ? { recurrenceRule: repeatRule, recurrenceMode: repeatMode }
            : {}),
        }),
      );
      if (result.ok) {
        const date = parsed.tokens.find((t) => t.kind === "date");
        const where = lists.find((l) => l.id === effectiveListId)?.name ?? "list";
        toast.success(`Added to ${where}${date ? `, due ${date.label.toLowerCase()}` : ""}`);
        update("", new Set());
        setManualDue(null);
        setManualPriority(null);
        setTagIds([]);
        setNotes("");
        setRepeatRule(null);
        setRepeatMode("fixed");
      }
      inputRef.current?.focus();
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle>Quick add</DialogTitle>
        <DialogDescription>
          Type it as you would say it: dates, #list, @tag and p1 to p3 are picked up. Or use the
          fields below. Enter adds the task and the box stays open.
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

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label>Due</Label>
          <DueDateField value={due} ctx={dateCtx} onChange={changeDue} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="quick-add-priority">Priority</Label>
          <Select value={String(priority)} onValueChange={(v) => setManualPriority(Number(v))}>
            <SelectTrigger id="quick-add-priority" className="h-11 w-full md:h-8">
              <SelectValue>{PRIORITY_LABELS[priority]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {PRIORITY_LABELS.map((label, i) => (
                <SelectItem key={label} value={String(i)}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-2 sm:col-span-2">
          <Label htmlFor="quick-add-list">List</Label>
          <Select
            value={effectiveListId}
            onValueChange={setListId}
            disabled={parsed.listId !== null}
          >
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
      </div>

      <div className="flex flex-col gap-2">
        <Label>Tags</Label>
        <TagField allTags={tags} selectedIds={tagIds} onChange={setTagIds} />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="task-repeat">Repeat</Label>
        <RepeatField
          rule={repeatRule}
          mode={repeatMode}
          dueDate={due.dueDate}
          today={dateCtx.today}
          onChange={changeRepeat}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="quick-add-notes">Notes</Label>
        <Textarea
          id="quick-add-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          maxLength={10000}
          placeholder="Plain text. Add details, links, or steps."
        />
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
