"use client";

import {
  AlertCircle,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  Flag,
  FolderInput,
  FolderOpen,
  Repeat as RepeatIcon,
  Target,
  Trash2,
  TriangleAlert,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useOptimistic, useState, useTransition, type ReactNode } from "react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { daysBetween, formatRowDay, formatTime, isOverdue, timeNowIn, trimTime } from "@/lib/dates";
import { describeStored } from "@/lib/recurrence";
import { cn } from "@/lib/utils";
import type { List } from "@/server/db/schema";
import type { TaskRow } from "@/server/data/tasks";
import {
  duplicateTaskAction,
  moveTaskAction,
  restoreTaskAction,
  trashTaskAction,
  updateTaskAction,
} from "../actions/tasks";
import { DueDateField } from "./due-date-field";
import { RepeatField } from "./repeat-field";
import { InlineAdd } from "./inline-add";
import { ListGlyph } from "../list-icons";
import { run, undoToast } from "./run-action";
import { repeatDate, TaskCheckbox } from "./task-row";
import { useTodos } from "./todos-provider";
import { DOCK_QUERY, useMediaQuery } from "@/hooks/use-media-query";
import { useTaskLinks } from "./use-task-links";
import { PRIORITY_LABELS, type DateContext } from "./types";
export type TaskDetailData = {
  task: TaskRow;
  subtasks: TaskRow[];
  /** Title of the parent when this task is a subtask. */
  parentTitle: string | null;
  /** The plan this task belongs to, and its phase, for the chip under the title. */
  plan?: { planId: string; title: string; phase: string | null } | null;
};

type Props = {
  detail: TaskDetailData | null;
  lists: List[];
  ctx: DateContext;
};

/**
 * Task detail drawer: right side on desktop, full screen on a phone. Every field saves on its
 * own (text on blur, pickers immediately); there is no Save button. The open task is in the URL
 * as `?task=<id>`, so reload and the back button work (CLAUDE.md §6.2).
 */
export function TaskDrawer({ detail, lists, ctx }: Props) {
  const router = useRouter();
  const { closeHref } = useTaskLinks();

  // From 1200px the detail docks beside the list (screen 6b): no overlay, the list stays usable,
  // and choosing another row swaps the task in place. Narrower, it is a sheet over the page.
  const docked = useMediaQuery(DOCK_QUERY);

  function close() {
    router.replace(closeHref, { scroll: false });
  }

  return (
    <Sheet open={detail !== null} onOpenChange={(open) => !open && close()} modal={!docked}>
      <SheetContent
        side="right"
        showCloseButton={false}
        overlay={!docked}
        onInteractOutside={docked ? (event) => event.preventDefault() : undefined}
        onOpenAutoFocus={docked ? (event) => event.preventDefault() : undefined}
        className="dash gap-0 bg-background data-[side=right]:w-full data-[side=right]:sm:max-w-[440px] md:bg-dash-card min-[1200px]:shadow-none"
        aria-describedby={undefined}
      >
        <SheetHeader>
          <SheetTitle className="sr-only">Task details</SheetTitle>
          <SheetDescription className="sr-only">
            Edit this task. Changes are saved automatically.
          </SheetDescription>
        </SheetHeader>
        {detail ? (
          <DrawerBody key={detail.task.id} detail={detail} lists={lists} ctx={ctx} close={close} />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

type SaveState = "idle" | "saving" | "saved" | "error";

const rowClass =
  "flex min-h-13 w-full items-center gap-3 border-t border-dash-edge py-2 text-left first:border-t-0";
const rowLabel = "flex w-24 shrink-0 items-center gap-2.5 text-[14px] text-dash-ink-soft";
const rowValue =
  "-mr-2 ml-auto inline-flex min-h-11 min-w-0 items-center justify-end gap-1 rounded-full px-2 text-right text-[14px] font-medium text-dash-ink outline-none transition-colors duration-150 hover:bg-dash-well focus-visible:ring-3 focus-visible:ring-ring/50";
const actionButton =
  "inline-flex h-12 flex-1 items-center justify-center gap-1.5 rounded-full bg-dash-well text-[14px] font-medium text-dash-ink outline-none transition-[background-color,transform] duration-150 ease-snap hover:bg-dash-edge focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-[0.97] md:h-10 md:flex-none md:px-4 [&_svg]:size-4";

function DrawerBody({
  detail,
  lists,
  ctx,
  close,
}: {
  detail: TaskDetailData;
} & Omit<Props, "detail"> & { close: () => void }) {
  const { task, subtasks, parentTitle, plan } = detail;
  const isSubtask = task.parentId !== null;
  const { hrefFor } = useTaskLinks();
  const router = useRouter();
  const { timeZone } = useTodos();
  const done = task.status === "done";

  const [title, setTitle] = useState(task.title);
  const [notes, setNotes] = useState(task.notes ?? "");
  const [titleError, setTitleError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [savedAt, setSavedAt] = useState<string | null>(null);

  // Pickers show the new value at once and fall back to the saved one if saving fails.
  const [view, applyPatch] = useOptimistic(task, (current, patch: Partial<TaskRow>) => ({
    ...current,
    ...patch,
  }));
  const [, startTransition] = useTransition();

  /** Saves some fields. Resolves to true when the server accepted them. */
  function save(patch: Partial<TaskRow>): Promise<boolean> {
    return new Promise((resolve) => {
      startTransition(async () => {
        applyPatch(patch);
        setSaveState("saving");
        const result = await run(updateTaskAction({ id: task.id, ...patch }));
        setSaveState(result.ok ? "saved" : "error");
        if (result.ok) setSavedAt(formatTime(timeNowIn(timeZone), ctx.locale));
        resolve(result.ok);
      });
    });
  }

  async function saveTitle() {
    const next = title.trim();
    if (!next) {
      setTitle(task.title);
      setTitleError("A task needs a title.");
      return;
    }
    setTitleError(null);
    if (next !== task.title && !(await save({ title: next }))) {
      setTitle(task.title); // saving failed: show what is really saved
      return;
    }
    setTitle(next);
  }

  async function saveNotes() {
    const next = notes.trim();
    if (next !== (task.notes ?? "") && !(await save({ notes: next }))) {
      setNotes(task.notes ?? "");
    }
  }

  async function trash() {
    const result = await run(trashTaskAction({ id: task.id }));
    if (!result.ok) return;
    close();
    undoToast("Task moved to Trash", () => void run(restoreTaskAction({ id: task.id })));
  }

  async function duplicate() {
    const result = await run(duplicateTaskAction({ id: task.id }));
    if (!result.ok) return;
    toast.success("Duplicated", {
      action: {
        label: "Open",
        onClick: () => router.replace(hrefFor(result.data.id), { scroll: false }),
      },
    });
  }

  async function moveTo(listId: string) {
    if (listId === task.listId) return;
    const target = lists.find((l) => l.id === listId);
    const from = { listId: task.listId };
    const result = await run(moveTaskAction({ id: task.id, listId }));
    if (result.ok) {
      undoToast(
        `Moved to ${target?.name ?? "list"}`,
        () => void run(moveTaskAction({ id: task.id, ...from })),
      );
    }
  }

  const subtasksDone = subtasks.filter((s) => s.status === "done").length;
  const currentList = lists.find((l) => l.id === view.listId);
  const late = view.dueDate && !done && isOverdue(view, ctx.today, ctx.timeNow);
  const lateDays = view.dueDate ? daysBetween(view.dueDate, ctx.today) : 0;
  const repeatText = describeStored(
    view.recurrenceRule,
    view.recurrenceMode,
    view.recurrenceUntil,
    ctx.locale,
  );

  const listPicker = (trigger: ReactNode) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="dash w-56 rounded-2xl p-1.5">
        <DropdownMenuLabel className="text-xs text-dash-ink-soft">Move to list</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={view.listId} onValueChange={(v) => void moveTo(v)}>
          {lists.map((l) => (
            <DropdownMenuRadioItem key={l.id} value={l.id} className="min-h-11 md:min-h-8">
              <ListGlyph icon={l.icon} className="size-4" />
              {l.name}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      {/* Top bar: back (phones) or close, and the save status (docs/new_design.md screen 2d). */}
      <div className="sticky top-0 z-10 flex items-center justify-between gap-2 bg-background/95 px-4 pt-[max(0.75rem,env(safe-area-inset-top,0px))] pb-2 backdrop-blur md:bg-dash-card/95 md:px-6 md:pt-4">
        <button
          type="button"
          onClick={close}
          className="-ml-2 inline-flex h-11 items-center gap-1 rounded-full pr-3 pl-1.5 text-[13px] font-medium text-dash-ink-soft outline-none hover:text-dash-ink focus-visible:ring-3 focus-visible:ring-ring/50 md:hidden"
        >
          <ChevronLeft aria-hidden className="size-4" />
          Back
        </button>
        <p
          role="status"
          aria-live="polite"
          className={cn(
            "inline-flex items-center gap-1 text-xs md:order-first",
            saveState === "error" ? "font-medium text-dash-bad" : "text-dash-ink-soft",
          )}
        >
          {saveState === "saving" ? (
            "Saving…"
          ) : saveState === "error" ? (
            <>
              <AlertCircle aria-hidden className="size-3.5" /> Not saved
            </>
          ) : (
            <>
              <Check aria-hidden className="size-3.5" />
              {saveState === "saved" && savedAt ? `Saved ${savedAt}` : "Saved"}
            </>
          )}
        </p>
        <button
          type="button"
          onClick={close}
          aria-label="Close task"
          className="hidden size-9 place-items-center rounded-full border border-dash-edge text-dash-ink outline-none hover:bg-dash-well focus-visible:ring-3 focus-visible:ring-ring/50 md:grid"
        >
          <X aria-hidden className="size-4" />
        </button>
      </div>

      <div className="flex flex-col gap-3 px-4 pb-8 md:gap-4 md:px-6">
        {isSubtask && parentTitle ? (
          <p className="text-[13px] text-dash-ink-soft">
            Subtask of{" "}
            <Link
              href={hrefFor(task.parentId ?? task.id)}
              scroll={false}
              className="font-medium text-dash-ink underline underline-offset-4"
            >
              {parentTitle}
            </Link>
          </p>
        ) : null}

        <div className="flex items-start gap-1">
          <div className="pt-1">
            <TaskCheckbox
              taskId={task.id}
              title={task.title}
              done={done}
              priority={view.priority}
              repeatsOn={repeatDate(view)}
            />
          </div>
          <div className="min-w-0 flex-1">
            <Label htmlFor="task-title" className="sr-only">
              Title
            </Label>
            <textarea
              id="task-title"
              value={title}
              rows={1}
              onChange={(e) => setTitle(e.target.value.replace(/\n/g, " "))}
              onBlur={() => void saveTitle()}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  e.currentTarget.blur();
                }
              }}
              maxLength={500}
              aria-invalid={titleError ? true : undefined}
              aria-describedby={titleError ? "task-title-error" : undefined}
              className={cn(
                "field-sizing-content w-full resize-none rounded-xl bg-transparent px-1.5 py-1.5 font-display text-[26px] leading-tight font-semibold tracking-[-0.01em] text-dash-ink outline-none hover:bg-dash-well/60 focus-visible:bg-dash-well md:text-[24px]",
                done && "text-dash-ink-soft line-through",
              )}
            />
            {titleError ? (
              <p id="task-title-error" role="alert" className="mt-1 text-sm text-dash-bad">
                {titleError}
              </p>
            ) : null}
          </div>
        </div>

        {plan && !isSubtask ? (
          <Link
            href={`/plans/${plan.planId}`}
            className="inline-flex h-8 w-fit max-w-full items-center gap-1.5 rounded-full bg-dash-well px-3 text-[13px] font-medium text-dash-ink outline-none transition-colors duration-150 hover:bg-dash-edge focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <Target aria-hidden className="size-3.5 shrink-0" />
            <span className="sr-only">Part of the plan </span>
            <span className="truncate">
              {plan.title}
              {plan.phase ? ` · ${plan.phase}` : ""}
            </span>
          </Link>
        ) : null}

        {late ? (
          <p className="inline-flex items-center gap-2 rounded-xl bg-dash-bad-bg px-3 py-2.5 text-[13px] font-semibold text-dash-bad">
            <TriangleAlert aria-hidden className="size-4" strokeWidth={2.25} />
            {lateDays > 0
              ? `Overdue by ${lateDays} ${lateDays === 1 ? "day" : "days"}, due ${formatRowDay(view.dueDate ?? ctx.today, ctx.today, ctx.locale)}`
              : "Overdue: the time has passed"}
          </p>
        ) : null}

        <section
          aria-label="Details"
          className="rounded-2xl border border-dash-edge bg-dash-card px-4 shadow-(--dash-card-shadow) md:border-0 md:px-0 md:shadow-none"
        >
          {isSubtask ? null : (
            <div className={rowClass}>
              <span className={rowLabel}>
                <FolderOpen aria-hidden className="size-4" /> List
              </span>
              {listPicker(
                <button
                  type="button"
                  className={rowValue}
                  aria-label={`List: ${currentList?.name ?? ""}. Change.`}
                >
                  {currentList ? <ListGlyph icon={currentList.icon} className="size-4" /> : null}
                  <span className="truncate">{currentList?.name}</span>
                  <ChevronRight aria-hidden className="size-4 text-dash-ink-soft" />
                </button>,
              )}
            </div>
          )}
          <div className={rowClass}>
            <span className={rowLabel}>
              <CalendarDays aria-hidden className="size-4" /> Due
            </span>
            <DueDateField
              value={{ dueDate: view.dueDate, dueTime: view.dueTime }}
              ctx={ctx}
              onChange={(due) =>
                // Without a date there is nothing to repeat from.
                void save(
                  due.dueDate === null && view.recurrenceRule
                    ? { ...due, recurrenceRule: null }
                    : due,
                )
              }
              trigger={() => (
                <button type="button" className={rowValue} aria-label="Due date. Change.">
                  <span
                    className={cn("truncate", !view.dueDate && "font-normal text-dash-ink-soft")}
                  >
                    {view.dueDate
                      ? view.dueDate === ctx.today
                        ? `Today, ${formatRowDay(view.dueDate, ctx.today, ctx.locale).replace(/^\S+ /, "")}`
                        : formatRowDay(view.dueDate, ctx.today, ctx.locale)
                      : "No date"}
                  </span>
                  <ChevronRight aria-hidden className="size-4 text-dash-ink-soft" />
                </button>
              )}
            />
          </div>
          <div className={rowClass}>
            <label htmlFor="task-time" className={rowLabel}>
              <Clock aria-hidden className="size-4" /> Time
            </label>
            <input
              id="task-time"
              type="time"
              disabled={!view.dueDate}
              value={view.dueTime ? trimTime(view.dueTime) : ""}
              onChange={(e) => void save({ dueTime: e.target.value || null })}
              title={view.dueDate ? "Add time" : "Pick a date first"}
              className="ml-auto h-11 rounded-full bg-transparent px-2 text-right text-[14px] font-medium text-dash-ink outline-none hover:bg-dash-well focus-visible:ring-3 focus-visible:ring-ring/50 disabled:text-dash-ink-soft"
            />
          </div>
          {isSubtask ? null : (
            <div className={rowClass}>
              <span className={rowLabel}>
                <RepeatIcon aria-hidden className="size-4" /> Repeat
              </span>
              <Popover>
                <PopoverTrigger asChild>
                  <button type="button" className={rowValue} aria-label="Repeat. Change.">
                    <span
                      className={cn("truncate", !repeatText && "font-normal text-dash-ink-soft")}
                    >
                      {repeatText ?? "Does not repeat"}
                    </span>
                    <ChevronRight aria-hidden className="size-4 shrink-0 text-dash-ink-soft" />
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  align="end"
                  collisionPadding={16}
                  className="dash max-h-(--radix-popover-content-available-height) w-[min(24rem,calc(100vw-2rem))] overflow-y-auto rounded-3xl border border-dash-edge bg-dash-card p-4 text-dash-ink shadow-[0_24px_48px_-16px_rgb(0_0_0/0.3)]"
                >
                  <h2 className="mb-1 font-display text-lg font-semibold">Repeat</h2>
                  <RepeatField
                    rule={view.recurrenceRule}
                    mode={view.recurrenceMode}
                    until={view.recurrenceUntil}
                    dueDate={view.dueDate}
                    today={ctx.today}
                    locale={ctx.locale}
                    onChange={(change) => void save(change)}
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}
          <div className="flex flex-col gap-2 border-t border-dash-edge py-3">
            <span className={rowLabel}>
              <Flag aria-hidden className="size-4" /> Priority
            </span>
            <div
              role="radiogroup"
              aria-label="Priority"
              className="grid grid-cols-4 gap-1 rounded-full bg-dash-well p-1"
            >
              {PRIORITY_LABELS.map((label, i) => {
                const on = view.priority === i;
                return (
                  <button
                    key={label}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => void save({ priority: i })}
                    className={cn(
                      "inline-flex h-10 items-center justify-center gap-1 rounded-full text-[13px] font-medium outline-none transition-colors duration-150 focus-visible:ring-3 focus-visible:ring-ring/50 md:h-8",
                      on
                        ? "bg-dash-raised font-semibold text-dash-ink shadow-(--dash-lift)"
                        : "text-dash-ink-soft hover:text-dash-ink",
                    )}
                  >
                    {on ? <Check aria-hidden className="size-3.5" /> : null}
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {isSubtask ? null : (
          <section
            aria-labelledby="subtasks-heading"
            className="rounded-2xl border border-dash-edge bg-dash-card px-4 pt-3 pb-1 shadow-(--dash-card-shadow) md:px-4"
          >
            <div className="flex items-baseline justify-between">
              <h2 id="subtasks-heading" className="text-[13px] font-semibold">
                Subtasks
              </h2>
              {subtasks.length > 0 ? (
                <span
                  aria-label={`${subtasksDone} of ${subtasks.length} done`}
                  className="font-mono text-xs font-medium text-dash-ink-soft"
                >
                  {subtasksDone}/{subtasks.length}
                </span>
              ) : null}
            </div>
            <ul className="mt-1">
              {subtasks.map((s) => (
                <li key={s.id} className="flex items-center gap-0.5">
                  <TaskCheckbox taskId={s.id} title={s.title} done={s.status === "done"} />
                  <Link
                    href={hrefFor(s.id)}
                    scroll={false}
                    className={cn(
                      "min-w-0 flex-1 break-words py-2 text-[15px] outline-none focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm",
                      s.status === "done" && "text-dash-ink-soft line-through",
                    )}
                  >
                    {s.title}
                  </Link>
                </li>
              ))}
            </ul>
            <InlineAdd listId={task.listId} parentId={task.id} label="Add subtask" />
          </section>
        )}

        <div className="rounded-2xl border border-dash-edge bg-dash-card px-4 py-3 shadow-(--dash-card-shadow) md:border-0 md:bg-dash-well md:shadow-none">
          <Label htmlFor="task-notes" className="sr-only">
            Notes
          </Label>
          <textarea
            id="task-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={() => void saveNotes()}
            rows={4}
            maxLength={10000}
            placeholder="Notes"
            className="field-sizing-content min-h-24 w-full resize-none bg-transparent text-[15px] leading-relaxed text-dash-ink outline-none placeholder:text-dash-ink-soft md:text-sm"
          />
        </div>

        <div className="flex gap-2 pt-1">
          <button type="button" className={actionButton} onClick={() => void duplicate()}>
            <Copy aria-hidden /> Duplicate
          </button>
          {isSubtask
            ? null
            : listPicker(
                <button type="button" className={actionButton}>
                  <FolderInput aria-hidden /> Move
                </button>,
              )}
          <button type="button" className={actionButton} onClick={() => void trash()}>
            <Trash2 aria-hidden /> Delete
          </button>
        </div>
        {isSubtask ? null : (
          <p className="text-xs text-dash-ink-soft">
            Completing every subtask leaves the task itself open.
          </p>
        )}
      </div>
    </div>
  );
}
