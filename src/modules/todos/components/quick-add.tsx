"use client";

import {
  CalendarDays,
  Check,
  ChevronDown,
  Flag,
  FolderOpen,
  Plus,
  SlidersHorizontal,
  X,
  type LucideIcon,
} from "lucide-react";
import { motion, useReducedMotion, type Transition } from "motion/react";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, useTransition, type FormEvent } from "react";
import { DashButton } from "@/components/dash/dash-button";
import { FAB_CLASS, FAB_ICON_CLASS, FabVoiceHint } from "@/components/shell/fab";
import { MicButton } from "@/modules/voice/components/mic-button";
import { useHoldToTalk, useVoiceAvailable } from "@/modules/voice/components/voice-events";
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
import { LOG_TRANSACTION_EVENT } from "@/modules/expenses/components/transaction-launcher";
import { createTaskAction, trashTaskAction } from "../actions/tasks";
import { deleteTaskForeverAction } from "../actions/trash";
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
import { run, undoToast } from "./run-action";
import { useTodos } from "./todos-provider";
import { PRIORITY_LABELS, type DateContext } from "./types";

/**
 * Pages where the round button adds a task on phones only: there it completes the tab bar
 * (docs/new_design.md §3: one + on every screen), but with a mouse these pages keep their
 * calm, button-free look (O, 2026-11-12).
 */
const PHONE_ONLY_ADD_BUTTON = ["/journal", "/search", "/settings", "/trash"];

/** How the priority pill glides between options: quick, no bounce (docs/design.md §9). */
/** The icon on each "Understood as" chip (docs/new_design.md screen 1d). */
const TOKEN_ICONS: Record<string, LucideIcon> = {
  date: CalendarDays,
  list: FolderOpen,
  priority: Flag,
};

const CAPTURE_TYPES = [
  { value: "task", label: "Task" },
  { value: "expense", label: "Expense" },
  { value: "income", label: "Income" },
  { value: "emi", label: "EMI or loan" },
  { value: "investment", label: "Investment" },
] as const;

const PILL_SPRING: Transition = { type: "spring", duration: 0.3, bounce: 0 };

function under(pathname: string, route: string): boolean {
  return pathname === route || pathname.startsWith(`${route}/`);
}

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
  // Hold the + to speak instead (docs/voice-spec.md §3).
  const voice = useVoiceAvailable();
  const hold = useHoldToTalk(voice);

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
      {/* On Expense Tracker pages the round button logs a transaction instead. q still adds a
          task everywhere. */}
      {under(pathname, "/expenses") ? null : (
        <button
          type="button"
          aria-label={
            voice ? "Quick add task (shortcut: q). Hold to speak" : "Quick add task (shortcut: q)"
          }
          title={voice ? "Add a task (q) · hold to speak" : "Add a task (q)"}
          data-fab
          {...hold.handlers}
          onClick={() => {
            if (!hold.consumeHold()) show();
          }}
          className={cn(
            FAB_CLASS,
            PHONE_ONLY_ADD_BUTTON.some((p) => under(pathname, p)) && "md:hidden",
          )}
        >
          <Plus aria-hidden className={cn(FAB_ICON_CLASS, open && "rotate-45")} />
        </button>
      )}
      {voice &&
      !under(pathname, "/expenses") &&
      !PHONE_ONLY_ADD_BUTTON.some((p) => under(pathname, p)) ? (
        <FabVoiceHint />
      ) : null}
      {/* The same sheet as Log a transaction (O, 2026-11-12): from the right with a mouse, from
          the bottom on a phone. It stays mounted while it slides out; a new key starts it fresh. */}
      <Sheet open={open} onOpenChange={setOpen} initialFocus={titleRef}>
        <QuickAddForm
          key={openCount}
          prefill={prefill}
          defaultListId={prefill.listId ?? defaultListId}
          inputRef={titleRef}
          onClose={() => setOpen(false)}
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
  onClose,
}: {
  onClose: () => void;
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
  const [repeatUntil, setRepeatUntil] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  // Opened from somewhere that already chose things (the inline field's "More options"): show all.
  const [more, setMore] = useState(Boolean(prefill.expanded));
  const [lastAdded, setLastAdded] = useState<{ id: string; message: string } | null>(null);

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
    if (next.dueDate === null) {
      setRepeatRule(null); // nothing to repeat from
      setRepeatUntil(null);
    }
  }

  function changeRepeat(change: RepeatChange) {
    if (change.recurrenceRule !== undefined) setRepeatRule(change.recurrenceRule);
    if (change.recurrenceMode) setRepeatMode(change.recurrenceMode);
    if (change.recurrenceUntil !== undefined) setRepeatUntil(change.recurrenceUntil);
    if (change.recurrenceRule === null) setRepeatUntil(null);
    if (change.dueDate) setManualDue({ dueDate: change.dueDate, dueTime: due.dueTime });
  }

  /** Undo the last add: the task goes, as if it was never added. */
  async function undoAdd() {
    if (!lastAdded) return;
    const { id } = lastAdded;
    setLastAdded(null);
    const trashed = await run(trashTaskAction({ id }));
    if (trashed.ok) await run(deleteTaskForeverAction({ id }));
    inputRef.current?.focus();
  }

  // Which footer button was pressed: Save task closes the sheet, Save and add another keeps it.
  const another = useRef(true);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    save(another.current);
    another.current = true;
  }

  function save(keepOpen: boolean) {
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
            ? {
                recurrenceRule: repeatRule,
                recurrenceMode: repeatMode,
                recurrenceUntil: repeatUntil,
              }
            : {}),
        }),
      );
      if (result.ok) {
        const date = parsed.tokens.find((t) => t.kind === "date");
        const where = lists.find((l) => l.id === effectiveListId)?.name ?? "list";
        const message = `Added "${value}" to ${where}${date ? `, due ${date.label.toLowerCase()}` : ""}`;
        if (!keepOpen) {
          // The sheet closes, so the confirmation and its Undo move to a toast.
          const { id } = result.data;
          onClose();
          undoToast(message, () => {
            void (async () => {
              const trashed = await run(trashTaskAction({ id }));
              if (trashed.ok) await run(deleteTaskForeverAction({ id }));
            })();
          });
          return;
        }
        setLastAdded({ id: result.data.id, message });
        update("", new Set());
        setManualDue(null);
        setManualPriority(null);
        setNotes("");
        setRepeatRule(null);
        setRepeatMode("fixed");
        setRepeatUntil(null);
      }
      inputRef.current?.focus();
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
      <SheetHeader title="Add a task" action={<MicButton onBeforeStart={onClose} />} />
      <SheetBody>
        <div className="flex flex-col gap-4">
          {/* The type row, as on the transaction sheet (docs/new_design.md §5 "Capture sheet"). */}
          <div
            role="radiogroup"
            aria-label="Type"
            className="no-scrollbar -mx-4 -mt-1 flex gap-2 overflow-x-auto px-4 sm:-mx-6 sm:px-6"
          >
            {CAPTURE_TYPES.map((t) => {
              const on = t.value === "task";
              return (
                <button
                  key={t.value}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => {
                    if (on) return;
                    onClose();
                    window.dispatchEvent(
                      new CustomEvent(LOG_TRANSACTION_EVENT, { detail: t.value }),
                    );
                  }}
                  className={cn(
                    "inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full px-4 text-[14px] font-medium whitespace-nowrap outline-none transition-colors duration-150 focus-visible:ring-3 focus-visible:ring-ring/50 md:h-9 md:text-[13px]",
                    on
                      ? "bg-dash-ink font-semibold text-dash-card"
                      : "bg-dash-well text-dash-ink hover:bg-dash-edge",
                  )}
                >
                  {on ? <Check aria-hidden className="size-3.5" strokeWidth={2.5} /> : null}
                  {t.label}
                </button>
              );
            })}
          </div>
          {/* The last add, confirmed in place with Undo (docs/new_design.md screen 1d). */}
          <div aria-live="polite" className="empty:hidden">
            {lastAdded ? (
              <p
                role="status"
                className="flex items-center justify-between gap-3 text-[13px] font-medium text-dash-good"
              >
                <span className="inline-flex min-w-0 items-center gap-1.5">
                  <Check aria-hidden className="size-4 shrink-0" strokeWidth={2.5} />
                  <span className="truncate">{lastAdded.message}</span>
                </span>
                <button
                  type="button"
                  onClick={() => void undoAdd()}
                  className="-mr-2 h-11 shrink-0 rounded-full px-3 font-semibold text-dash-ink outline-none hover:bg-dash-well focus-visible:ring-3 focus-visible:ring-ring/50 md:h-8"
                >
                  Undo
                </button>
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-3">
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
              // Enter adds the task and keeps the sheet open for the next one (CLAUDE.md §6.2).
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  save(true);
                }
              }}
              placeholder="pay rent tomorrow 5pm #home p1"
              className="h-14 w-full rounded-2xl bg-dash-well px-4 text-lg text-dash-ink caret-dash-accent outline-none transition-shadow duration-150 placeholder:text-dash-ink-soft/70 focus-visible:ring-3 focus-visible:ring-ring/40"
            />
            {parsed.tokens.length > 0 ? (
              <div className="flex flex-col gap-2">
                <p className="text-[12px] text-dash-ink-soft">Understood as</p>
                <p className="font-display text-xl leading-tight font-semibold break-words">
                  {parsed.title || "…"}
                </p>
                <ul aria-label="Understood from your text" className="flex flex-wrap gap-2">
                  {parsed.tokens.map((token) => {
                    const Icon = TOKEN_ICONS[token.kind] ?? CalendarDays;
                    return (
                      <li
                        key={tokenKey(token)}
                        className="inline-flex animate-in items-center gap-1.5 rounded-full border border-dash-edge bg-dash-card pl-3 text-[13px] font-medium text-dash-ink duration-150 fade-in-0 zoom-in-95"
                      >
                        <Icon aria-hidden className="size-3.5 text-dash-ink-soft" />
                        {token.label.replace(/^(List|Priority): /, "")}
                        <span className="sr-only"> ({token.label})</span>
                        <button
                          type="button"
                          aria-label={`Remove ${token.label}`}
                          onClick={() => removeToken(token)}
                          className="grid size-11 place-items-center rounded-full text-dash-ink-soft outline-none hover:text-dash-ink focus-visible:ring-3 focus-visible:ring-ring/50 md:size-8"
                        >
                          <X className="size-3.5" aria-hidden />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null}
          </div>

          <button
            type="button"
            aria-expanded={more}
            aria-controls="quick-add-more"
            onClick={() => setMore((m) => !m)}
            className="inline-flex min-h-11 w-fit items-center gap-1.5 rounded-full text-[13px] font-semibold text-dash-ink outline-none focus-visible:ring-3 focus-visible:ring-ring/50 md:min-h-8"
          >
            <SlidersHorizontal aria-hidden className="size-4" />
            {more ? "Fewer options" : "More options"}
            <ChevronDown
              aria-hidden
              className={cn("size-4 transition-transform duration-200", more && "rotate-180")}
            />
          </button>

          {more ? (
            <div id="quick-add-more" className="flex flex-col gap-5">
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
                        "relative z-0 inline-flex h-11 cursor-pointer items-center justify-center gap-1 rounded-full text-[13px] font-medium transition-colors duration-150 select-none has-focus-visible:ring-3 has-focus-visible:ring-ring/50 md:h-9",
                        priority === i
                          ? "font-semibold text-dash-ink"
                          : "text-dash-ink-soft hover:text-dash-ink",
                      )}
                    >
                      {/* The raised pill slides to the chosen priority (O, 2026-11-12). */}
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
                      {priority === i ? <Check aria-hidden className="size-3.5" /> : null}
                      {name}
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <span className={label}>Repeat</span>
                <RepeatField
                  rule={repeatRule}
                  mode={repeatMode}
                  until={repeatUntil}
                  dueDate={due.dueDate}
                  today={dateCtx.today}
                  locale={dateCtx.locale}
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
          ) : null}
        </div>
      </SheetBody>
      <SheetFooter>
        {/* The same pair as the transaction sheet (O, 2026-11-15). */}
        <div className="hidden flex-1 md:block" />
        <DashButton
          type="submit"
          onClick={() => (another.current = false)}
          className="h-12! font-semibold max-md:flex-1 md:h-10!"
          disabled={pending || !parsed.title}
        >
          {pending ? "Saving…" : "Save task"}
        </DashButton>
        <DashButton
          type="submit"
          variant="secondary"
          onClick={() => (another.current = true)}
          className="h-12! max-md:flex-1 md:h-10!"
          disabled={pending || !parsed.title}
        >
          Save and add another
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
