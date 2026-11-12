"use client";

import { Plus, X } from "lucide-react";
import { motion, useReducedMotion, type Transition } from "motion/react";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, useTransition, type FormEvent } from "react";
import { toast } from "sonner";
import { DashButton } from "@/components/dash/dash-button";
import { FAB_CLASS, FAB_ICON_CLASS } from "@/components/shell/fab";
import { Sheet, SheetBody, SheetFooter, SheetHeader } from "@/components/dash/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useOpenOnArrival } from "@/hooks/use-open-on-arrival";
import { timeNowIn, todayIn } from "@/lib/dates";
import type { RecurrenceMode } from "@/lib/recurrence";
import { cn } from "@/lib/utils";
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
import { ListGlyph } from "../list-icons";
import { run } from "./run-action";
import { useTodos } from "./todos-provider";
import { PRIORITY_LABELS, type DateContext } from "./types";

/** How the priority pill glides between options: quick, no bounce (docs/design.md §9). */
/** Pages without the round "add a task" button. */
const NO_ADD_BUTTON = ["/expenses", "/journal", "/search", "/settings", "/trash"];

const PILL_SPRING: Transition = { type: "spring", duration: 0.3, bounce: 0 };

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
 * has (due date and time, priority, list, notes, repeat), and understands a typed sentence.
 */
export function QuickAdd() {
  const { lists, inboxId } = useTodos();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [prefill, setPrefill] = useState<QuickAddPrefill>({});
  // A new key starts the form fresh each time it is opened.
  const [openCount, setOpenCount] = useState(0);
  const titleRef = useRef<HTMLInputElement>(null);

  // Default to the list being viewed, otherwise General (the default list).
  const viewed = /^\/lists\/([0-9a-f-]{36})/.exec(pathname)?.[1];
  const defaultListId = lists.some((l) => l.id === viewed) ? (viewed as string) : inboxId;

  function show(next: QuickAddPrefill = {}) {
    setPrefill(next);
    setOpenCount((n) => n + 1);
    setOpen(true);
  }

  // The welcome page's "Add a task" button arrives with ?add=task.
  useOpenOnArrival("task", () => show());

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
      {/* On Expense Tracker pages the round button logs a transaction instead; the Journal,
          Search, Settings and Trash have none (O, 2026-11-12). q still adds a task everywhere. */}
      {NO_ADD_BUTTON.some((p) => pathname === p || pathname.startsWith(`${p}/`)) ? null : (
        <button
          type="button"
          aria-label="Quick add task (shortcut: q)"
          title="Add a task (q)"
          onClick={() => show()}
          className={FAB_CLASS}
        >
          <Plus aria-hidden className={cn(FAB_ICON_CLASS, open && "rotate-45")} />
        </button>
      )}
      {/* The same sheet as Log a transaction (O, 2026-11-12): from the right with a mouse, from
          the bottom on a phone. It stays mounted while it slides out; a new key starts it fresh. */}
      <Sheet open={open} onOpenChange={setOpen} initialFocus={titleRef}>
        <QuickAddForm
          key={openCount}
          prefill={prefill}
          defaultListId={prefill.listId ?? defaultListId}
          inputRef={titleRef}
        />
      </Sheet>
    </>
  );
}

type Due = { dueDate: string | null; dueTime: string | null };

const label = "text-[13px] font-medium text-dash-ink";

function QuickAddForm({
  prefill,
  defaultListId,
  inputRef,
}: {
  prefill: QuickAddPrefill;
  defaultListId: string;
  /** The title field: the sheet focuses it on open, and Enter puts the caret back in it. */
  inputRef: React.RefObject<HTMLInputElement | null>;
}) {
  const { lists, timeZone, locale, weekStartsOn } = useTodos();
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
    parse(prefill.title ?? "", new Set(), lists, timeZone, locale),
  );
  const [listId, setListId] = useState(defaultListId);
  // Choices made with the controls win over what was understood from the sentence.
  const [manualDue, setManualDue] = useState<Due | null>(
    prefill.dueDate ? { dueDate: prefill.dueDate, dueTime: null } : null,
  );
  const [manualPriority, setManualPriority] = useState<number | null>(null);
  const reduceMotion = useReducedMotion();
  const [notes, setNotes] = useState("");
  const [repeatRule, setRepeatRule] = useState<string | null>(null);
  const [repeatMode, setRepeatMode] = useState<RecurrenceMode>("fixed");
  const [pending, startTransition] = useTransition();

  // A #list in the text wins over the menu; removing its chip gives the menu back.
  const effectiveListId = parsed.listId ?? listId;
  const due: Due = manualDue ?? { dueDate: parsed.dueDate, dueTime: parsed.dueTime };
  const priority = manualPriority ?? parsed.priority ?? 0;

  function update(nextTitle: string, nextIgnored: ReadonlySet<string>) {
    setTitle(nextTitle);
    setIgnored(nextIgnored);
    setParsed(parse(nextTitle, nextIgnored, lists, timeZone, locale));
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
      const result = await run(
        createTaskAction({
          listId: effectiveListId,
          title: value,
          notes,
          priority,
          ...(due.dueDate ? { dueDate: due.dueDate, dueTime: due.dueTime } : {}),
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
        setNotes("");
        setRepeatRule(null);
        setRepeatMode("fixed");
      }
      inputRef.current?.focus();
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
      <SheetHeader
        title="Add a task"
        description="Type it as you would say it: dates, #list and p1 to p3 are picked up. Enter adds it and the sheet stays open for the next one."
      />
      <SheetBody>
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <label htmlFor="quick-add-title" className="sr-only">
              Task
            </label>
            <input
              id="quick-add-title"
              ref={inputRef}
              value={title}
              onChange={(e) => update(e.target.value, ignored)}
              maxLength={500}
              disabled={pending}
              enterKeyHint="done"
              placeholder="What needs doing?"
              className="h-14 w-full rounded-2xl bg-dash-well px-4 text-lg text-dash-ink outline-none transition-shadow duration-150 placeholder:text-dash-ink-soft/70 focus-visible:ring-3 focus-visible:ring-ring/40"
            />
            {parsed.tokens.length > 0 ? (
              <ul aria-label="Understood from your text" className="flex flex-wrap gap-1.5">
                {parsed.tokens.map((token) => (
                  <li
                    key={tokenKey(token)}
                    className="inline-flex animate-in items-center rounded-full bg-dash-ink pl-3 text-[13px] text-dash-card duration-150 fade-in-0 zoom-in-95"
                  >
                    {token.label}
                    <button
                      type="button"
                      aria-label={`Remove ${token.label}`}
                      onClick={() => removeToken(token)}
                      className="grid size-11 place-items-center rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50 md:size-8"
                    >
                      <X className="size-3.5" aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <span className={label}>Due</span>
              <DueDateField value={due} ctx={dateCtx} onChange={changeDue} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="quick-add-list" className={label}>
                List
              </label>
              <Select
                value={effectiveListId}
                onValueChange={setListId}
                disabled={parsed.listId !== null}
              >
                <SelectTrigger id="quick-add-list" className="h-11 w-full rounded-xl md:h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {lists.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      <ListGlyph icon={l.icon} className="size-4" />
                      {l.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div
            role="radiogroup"
            aria-labelledby="quick-add-priority-label"
            className="flex flex-col gap-1.5"
          >
            <span id="quick-add-priority-label" className={label}>
              Priority
            </span>
            <div className="grid grid-cols-4 gap-1 rounded-full bg-dash-well p-1">
              {PRIORITY_LABELS.map((name, i) => (
                <label
                  key={name}
                  className={cn(
                    "relative z-0 inline-flex h-11 cursor-pointer items-center justify-center rounded-full text-[13px] font-medium transition-colors duration-150 select-none has-focus-visible:ring-3 has-focus-visible:ring-ring/50 md:h-9",
                    priority === i ? "text-dash-ink" : "text-dash-ink-soft hover:text-dash-ink",
                  )}
                >
                  {/* The raised pill slides to the chosen priority instead of jumping (O, 2026-11-12). */}
                  {priority === i ? (
                    <motion.span
                      aria-hidden
                      layoutId="quick-add-priority-pill"
                      transition={reduceMotion ? { duration: 0 } : PILL_SPRING}
                      className="absolute inset-0 -z-10 rounded-full bg-dash-raised shadow-(--dash-lift)"
                    />
                  ) : null}
                  <input
                    type="radio"
                    name="quick-add-priority"
                    value={i}
                    checked={priority === i}
                    onChange={() => setManualPriority(i)}
                    className="absolute inset-0 m-0 cursor-pointer appearance-none rounded-full opacity-0"
                  />
                  {name}
                </label>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="task-repeat" className={label}>
              Repeat
            </label>
            <RepeatField
              rule={repeatRule}
              mode={repeatMode}
              dueDate={due.dueDate}
              today={dateCtx.today}
              onChange={changeRepeat}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="quick-add-notes" className={label}>
              Notes
            </label>
            <Textarea
              id="quick-add-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              maxLength={10000}
              placeholder="Plain text. Add details, links, or steps."
              className="rounded-xl"
            />
          </div>
        </div>
      </SheetBody>
      <SheetFooter>
        <DashButton type="submit" className="h-11! w-full" disabled={pending || !parsed.title}>
          Add task
        </DashButton>
      </SheetFooter>
    </form>
  );
}

/** Works out "today" in the user's timezone the way the server does, then parses the sentence. */
function parse(
  text: string,
  ignored: ReadonlySet<string>,
  lists: { id: string; name: string }[],
  timeZone: string,
  locale: string,
): ParsedQuickAdd {
  const now = new Date();
  return parseQuickAdd(text, {
    today: todayIn(timeZone, now),
    timeNow: timeNowIn(timeZone, now),
    locale,
    lists,
    ignored,
  });
}
