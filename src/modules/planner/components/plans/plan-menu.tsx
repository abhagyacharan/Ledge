"use client";

import {
  Archive,
  CalendarClock,
  Check,
  Ellipsis,
  Minus,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition, type ReactNode } from "react";
import { toast } from "sonner";
import { dashButton } from "@/components/dash/dash-button";
import { Sheet, SheetBody, SheetFooter, SheetHeader } from "@/components/dash/sheet";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useIsMobile } from "@/hooks/use-mobile";
import { addDaysIso, formatRowDay } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { DueDateField } from "@/modules/todos/components/due-date-field";
import { run, undoToast } from "@/modules/todos/components/run-action";
import type { DateContext } from "@/modules/todos/components/types";
import {
  deletePlanAction,
  renamePlanAction,
  reschedulePlanAction,
  restorePlanAction,
  setPlanStatusAction,
} from "../../actions";
import { makeDateMapper, rescheduleTasks, type Schedule } from "../../reschedule";
import { PLAN_WINDOW_DAYS, TITLE_MAX } from "../../schema";

export type MenuPlan = {
  id: string;
  title: string;
  status: "active" | "done" | "archived";
  endDate: string | null;
  /** Top-level tasks, for "Also move its 18 tasks to Trash". */
  taskCount: number;
  doneCount: number;
};

export type OpenTask = {
  id: string;
  title: string;
  dueDate: string | null;
  recurrenceUntil: string | null;
};

type View = null | "menu" | "rename" | "reschedule";
type Item = {
  key: string;
  label: string;
  hint?: string;
  icon: LucideIcon;
  danger?: boolean;
  onSelect: () => void;
};

const actionRing =
  "outline-none focus-visible:shadow-[0_0_0_2px_var(--dash-card),0_0_0_4px_var(--dash-ink)]";

/**
 * The plan's ⋯ menu (docs/plans designs 8l). With a mouse it is a menu; on a phone a bottom sheet.
 * Rename and Reschedule open a sheet; Delete is the one action that asks first, because it can
 * take tasks with it. Archive and the status changes need no confirmation and show Undo.
 */
export function PlanMenu({
  plan,
  openTasks,
  ctx,
}: {
  plan: MenuPlan;
  openTasks: OpenTask[];
  ctx: DateContext;
}) {
  const router = useRouter();
  const mobile = useIsMobile();
  const [view, setView] = useState<View>(null);
  const [deleting, setDeleting] = useState(false);
  const [, startTransition] = useTransition();

  const datedOpen = openTasks.filter((t) => t.dueDate !== null).length;

  function setStatus(next: MenuPlan["status"], message: string) {
    const before = plan.status;
    setView(null);
    startTransition(async () => {
      const result = await run(setPlanStatusAction({ planId: plan.id, status: next }));
      if (!result.ok) return;
      undoToast(message, () => void run(setPlanStatusAction({ planId: plan.id, status: before })));
    });
  }

  const items: Item[] = [
    {
      key: "rename",
      label: "Rename",
      icon: Pencil,
      onSelect: () => setView("rename"),
    },
    ...(plan.status === "active" && datedOpen > 0
      ? [
          {
            key: "reschedule",
            label: "Reschedule",
            hint: `${datedOpen} open ${datedOpen === 1 ? "task" : "tasks"}`,
            icon: CalendarClock,
            onSelect: () => setView("reschedule"),
          },
        ]
      : []),
    ...(plan.status === "active"
      ? [
          {
            key: "done",
            label: "Mark done",
            icon: Check,
            onSelect: () => setStatus("done", `Marked "${plan.title}" done`),
          },
        ]
      : [
          {
            key: "active",
            label: "Make active again",
            icon: RotateCcw,
            onSelect: () => setStatus("active", `"${plan.title}" is active again`),
          },
        ]),
    ...(plan.status !== "archived"
      ? [
          {
            key: "archive",
            label: "Archive",
            hint: "Tasks stay in your lists",
            icon: Archive,
            onSelect: () => setStatus("archived", `Archived "${plan.title}"`),
          },
        ]
      : []),
    {
      key: "delete",
      label: "Delete",
      icon: Trash2,
      danger: true,
      onSelect: () => {
        setView(null);
        setDeleting(true);
      },
    },
  ];

  const trigger = (
    <button
      type="button"
      aria-label="Plan options"
      aria-haspopup="menu"
      onClick={mobile ? () => setView("menu") : undefined}
      className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-dash-edge bg-dash-card text-dash-ink outline-none transition-[background-color,transform] duration-150 ease-snap hover:bg-dash-well focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-[0.97]"
    >
      <Ellipsis aria-hidden className="size-[18px]" />
    </button>
  );

  return (
    <>
      {mobile ? (
        trigger
      ) : (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="dash w-64 rounded-2xl p-1.5">
            {items.map((item) => (
              <div key={item.key}>
                {item.danger ? <DropdownMenuSeparator /> : null}
                <DropdownMenuItem
                  variant={item.danger ? "destructive" : "default"}
                  onSelect={item.onSelect}
                  className="min-h-9 gap-2.5"
                >
                  <item.icon aria-hidden />
                  <span className="flex-1">{item.label}</span>
                  {item.hint ? (
                    <span className="text-xs text-dash-ink-soft">{item.hint}</span>
                  ) : null}
                </DropdownMenuItem>
              </div>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      <Sheet open={view !== null} onOpenChange={(open) => !open && setView(null)}>
        {view === "menu" ? (
          <MenuSheet plan={plan} items={items} />
        ) : view === "rename" ? (
          <RenameSheet plan={plan} onDone={() => setView(null)} />
        ) : view === "reschedule" ? (
          <RescheduleSheet
            plan={plan}
            openTasks={openTasks}
            ctx={ctx}
            onDone={() => setView(null)}
          />
        ) : null}
      </Sheet>

      <DeletePlanDialog
        open={deleting}
        onOpenChange={setDeleting}
        plan={plan}
        onDeleted={(withTasks) => {
          router.push("/plans");
          undoToast(
            withTasks && plan.taskCount > 0
              ? `Deleted "${plan.title}" and its tasks`
              : `Deleted "${plan.title}"`,
            () =>
              void run(restorePlanAction({ planId: plan.id }), {
                success: `Restored "${plan.title}"`,
              }),
          );
        }}
      />
    </>
  );
}

// ---------------------------------------------------------------------------------------------

function MenuSheet({ plan, items }: { plan: MenuPlan; items: Item[] }) {
  return (
    <>
      <SheetHeader title={plan.title} description={`${plan.doneCount} of ${plan.taskCount} done`} />
      <SheetBody className="flex flex-col gap-1.5 pb-4">
        {items.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={item.onSelect}
            className={cn(
              "flex min-h-13 w-full items-center gap-3 rounded-2xl px-3 text-left text-[15px] font-medium transition-colors duration-150 hover:bg-dash-well",
              item.danger ? "font-semibold text-dash-bad" : "text-dash-ink",
              actionRing,
            )}
          >
            <item.icon aria-hidden className="size-[18px] shrink-0" />
            <span className="flex-1">{item.label}</span>
            {item.hint ? (
              <span className="text-[13px] font-normal text-dash-ink-soft">{item.hint}</span>
            ) : null}
          </button>
        ))}
      </SheetBody>
    </>
  );
}

function RenameSheet({ plan, onDone }: { plan: MenuPlan; onDone: () => void }) {
  const [title, setTitle] = useState(plan.title);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const next = title.trim();
    if (!next) {
      setError("Give the plan a name.");
      return;
    }
    if (next === plan.title) {
      onDone();
      return;
    }
    startTransition(async () => {
      const result = await run(renamePlanAction({ planId: plan.id, title: next }));
      if (result.ok) onDone();
      else setError(result.error);
    });
  }

  return (
    <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
      <SheetHeader title="Rename plan" />
      <SheetBody>
        <label htmlFor="plan-title" className="sr-only">
          Plan name
        </label>
        <input
          id="plan-title"
          value={title}
          maxLength={TITLE_MAX}
          onChange={(e) => {
            setTitle(e.target.value);
            setError(null);
          }}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "plan-title-error" : undefined}
          className="h-12 w-full rounded-xl bg-dash-well px-4 text-base outline-none focus-visible:ring-3 focus-visible:ring-ring/50 md:text-[15px]"
        />
        {error ? (
          <p id="plan-title-error" role="alert" className="mt-2 text-sm text-dash-bad">
            {error}
          </p>
        ) : null}
        <p className="mt-2 font-mono text-xs text-dash-ink-soft">
          {title.trim().length} / {TITLE_MAX}
        </p>
      </SheetBody>
      <SheetFooter>
        <button
          type="submit"
          disabled={pending}
          className={cn(dashButton(), "h-12 flex-1 md:h-11")}
        >
          Save name
        </button>
      </SheetFooter>
    </form>
  );
}

function RescheduleSheet({
  plan,
  openTasks,
  ctx,
  onDone,
}: {
  plan: MenuPlan;
  openTasks: OpenTask[];
  ctx: DateContext;
  onDone: () => void;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"shift" | "spread">("shift");
  const [days, setDays] = useState(3);
  const tomorrow = addDaysIso(ctx.today, 1);
  const [endDate, setEndDate] = useState(
    plan.endDate && plan.endDate > ctx.today ? plan.endDate : addDaysIso(ctx.today, 7),
  );
  const [pending, startTransition] = useTransition();
  const lastDay = addDaysIso(ctx.today, PLAN_WINDOW_DAYS);

  const dated = useMemo(
    () =>
      openTasks
        .filter((t): t is OpenTask & { dueDate: string } => t.dueDate !== null)
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
    [openTasks],
  );

  const schedule: Schedule = mode === "shift" ? { mode, days } : { mode, endDate };
  const problem =
    mode === "shift"
      ? days === 0
        ? "Pick how many days to move."
        : null
      : endDate < tomorrow || endDate > lastDay
        ? `Pick a day from tomorrow to ${formatRowDay(lastDay, ctx.today, ctx.locale)}.`
        : null;

  const { first, last, moved } = useMemo(() => {
    const sched: Schedule = mode === "shift" ? { mode, days } : { mode, endDate };
    const map = makeDateMapper(sched, ctx.today, plan.endDate);
    const patches = rescheduleTasks(openTasks, map);
    const byId = new Map(patches.map((p) => [p.id, p.dueDate]));
    const a = dated[0];
    const b = dated[dated.length - 1];
    return {
      moved: patches.length,
      first: a ? { title: a.title, from: a.dueDate, to: byId.get(a.id) ?? a.dueDate } : null,
      last:
        b && b.id !== a?.id
          ? { title: b.title, from: b.dueDate, to: byId.get(b.id) ?? b.dueDate }
          : null,
    };
  }, [mode, days, endDate, openTasks, dated, ctx.today, plan.endDate]);

  const day = (iso: string) => formatRowDay(iso, ctx.today, ctx.locale);

  function submit() {
    if (problem) return;
    startTransition(async () => {
      const result = await run(reschedulePlanAction({ planId: plan.id, schedule }));
      if (!result.ok) return;
      toast.success(`Moved ${result.data.moved} ${result.data.moved === 1 ? "task" : "tasks"}`);
      onDone();
      router.refresh();
    });
  }

  const preview = (
    <ul className="space-y-0.5 text-xs leading-relaxed text-dash-ink-soft" aria-live="polite">
      {[first, last].map((p) =>
        p ? (
          <li key={p.title + p.from}>
            {p.title}{" "}
            <span className="font-mono text-dash-ink">
              {day(p.from)} → {day(p.to)}
            </span>
          </li>
        ) : null,
      )}
    </ul>
  );

  return (
    <>
      <SheetHeader
        title="Reschedule plan"
        description={`Only the ${moved} open ${moved === 1 ? "task" : "tasks"} move. Done tasks keep their dates.`}
      />
      <SheetBody className="flex flex-col gap-2">
        <div role="radiogroup" aria-label="How to reschedule" className="flex flex-col gap-2">
          <div
            className={cn(
              "flex flex-col gap-3 rounded-2xl p-3.5",
              mode === "shift"
                ? "shadow-[inset_0_0_0_2px_var(--dash-ink)]"
                : "shadow-[inset_0_0_0_1px_var(--dash-edge)]",
            )}
          >
            <RadioRow
              checked={mode === "shift"}
              onSelect={() => setMode("shift")}
              label="Move every open task by"
            />
            {mode === "shift" ? (
              <>
                <div className="flex items-center gap-2.5 pl-[30px]">
                  <button
                    type="button"
                    aria-label="One day fewer"
                    disabled={days <= -60}
                    onClick={() => setDays((d) => Math.max(-60, d - 1))}
                    className={cn(
                      "grid size-11 place-items-center rounded-full bg-dash-well hover:bg-dash-edge disabled:opacity-40",
                      actionRing,
                    )}
                  >
                    <Minus aria-hidden className="size-[18px]" />
                  </button>
                  <label htmlFor="plan-shift-days" className="sr-only">
                    Days
                  </label>
                  <input
                    id="plan-shift-days"
                    inputMode="numeric"
                    value={days}
                    onChange={(e) => {
                      const n = Number.parseInt(e.target.value.replace(/[^\d-]/g, ""), 10);
                      setDays(Number.isNaN(n) ? 0 : Math.max(-60, Math.min(365, n)));
                    }}
                    className="h-11 w-16 rounded-xl bg-dash-well text-center font-display text-[22px] font-semibold outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                  />
                  <button
                    type="button"
                    aria-label="One day more"
                    disabled={days >= 365}
                    onClick={() => setDays((d) => Math.min(365, d + 1))}
                    className={cn(
                      "grid size-11 place-items-center rounded-full bg-dash-well hover:bg-dash-edge disabled:opacity-40",
                      actionRing,
                    )}
                  >
                    <Plus aria-hidden className="size-[18px]" />
                  </button>
                  <span className="text-[15px] font-medium">
                    {Math.abs(days) === 1 ? "day" : "days"}
                    {days < 0 ? " earlier" : ""}
                  </span>
                </div>
                <div className="pl-[30px]">{preview}</div>
              </>
            ) : null}
          </div>

          <div
            className={cn(
              "flex flex-col gap-3 rounded-2xl p-3.5",
              mode === "spread"
                ? "shadow-[inset_0_0_0_2px_var(--dash-ink)]"
                : "shadow-[inset_0_0_0_1px_var(--dash-edge)]",
            )}
          >
            <RadioRow
              checked={mode === "spread"}
              onSelect={() => setMode("spread")}
              label="Spread to a new end date"
            />
            <p className="pl-[30px] text-xs leading-snug text-dash-ink-soft">
              Keeps the order and gaps, stretched or squeezed to fit.
            </p>
            {mode === "spread" ? (
              <div className="flex flex-col gap-2 pl-[30px]">
                <DueDateField
                  value={{ dueDate: endDate, dueTime: null }}
                  ctx={ctx}
                  minDate={tomorrow}
                  allowClear={false}
                  allowTime={false}
                  title="New end date"
                  onChange={(due) => due.dueDate && setEndDate(due.dueDate)}
                  trigger={(label) => (
                    <button
                      type="button"
                      aria-label={`New end date: ${label}. Change.`}
                      className={cn(
                        "inline-flex h-11 w-fit items-center gap-2 rounded-xl bg-dash-well px-3.5 font-mono text-sm font-medium",
                        actionRing,
                      )}
                    >
                      <CalendarClock aria-hidden className="size-4" />
                      {day(endDate)}
                    </button>
                  )}
                />
                {preview}
              </div>
            ) : null}
          </div>
        </div>
        {problem ? (
          <p role="alert" className="text-sm text-dash-bad">
            {problem}
          </p>
        ) : null}
      </SheetBody>
      <SheetFooter>
        <button
          type="button"
          disabled={pending || problem !== null || moved === 0}
          onClick={submit}
          className={cn(dashButton(), "h-12 flex-1 md:h-11")}
        >
          Move {moved} {moved === 1 ? "task" : "tasks"}
        </button>
      </SheetFooter>
    </>
  );
}

function RadioRow({
  checked,
  onSelect,
  label,
}: {
  checked: boolean;
  onSelect: () => void;
  label: ReactNode;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      onClick={onSelect}
      className={cn(
        "flex min-h-6 items-center gap-2.5 text-left text-[15px]",
        checked ? "font-semibold" : "font-medium",
        actionRing,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "grid size-5 shrink-0 place-items-center rounded-full",
          checked ? "bg-dash-ink text-dash-card" : "border-[1.5px] border-dash-ink-soft",
        )}
      >
        {checked ? <Check className="size-3" strokeWidth={3} /> : null}
      </span>
      {label}
    </button>
  );
}

// ---------------------------------------------------------------------------------------------

function DeletePlanDialog({
  open,
  onOpenChange,
  plan,
  onDeleted,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: MenuPlan;
  onDeleted: (withTasks: boolean) => void;
}) {
  const [withTasks, setWithTasks] = useState(true);
  const [pending, startTransition] = useTransition();
  const n = plan.taskCount;
  const tasksWord = `${n} ${n === 1 ? "task" : "tasks"}`;
  const takesTasks = withTasks && n > 0;

  function confirm() {
    startTransition(async () => {
      const result = await run(deletePlanAction({ planId: plan.id, withTasks }));
      if (!result.ok) return;
      onOpenChange(false);
      onDeleted(withTasks);
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="dash rounded-3xl border-dash-edge bg-dash-card p-6 text-dash-ink sm:max-w-sm">
        <AlertDialogHeader className="text-left sm:text-left">
          <AlertDialogTitle className="font-display text-xl font-semibold">
            Delete &ldquo;{plan.title}&rdquo;?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm text-dash-ink-soft">
            The plan goes to Trash and can be restored for 30 days.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {n > 0 ? (
          <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-2xl bg-dash-well px-3.5 py-2.5 text-[14px] font-medium">
            <input
              type="checkbox"
              checked={withTasks}
              onChange={(e) => setWithTasks(e.target.checked)}
              className="size-5 shrink-0 rounded-md"
            />
            Also move its {tasksWord} to Trash
          </label>
        ) : null}
        <div className="mt-1 flex flex-col gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={confirm}
            className={cn(
              dashButton({ variant: "primary" }),
              "h-12 w-full bg-dash-bad text-[15px] font-semibold text-white hover:bg-dash-bad/90 md:h-11 md:text-sm dark:text-dash-card",
            )}
          >
            <Trash2 aria-hidden />
            {takesTasks ? `Delete plan and ${tasksWord}` : "Delete plan"}
          </button>
          <AlertDialogCancel className="h-12 w-full rounded-full border-0 bg-transparent text-[15px] font-semibold shadow-none hover:bg-dash-well md:h-11 md:text-sm">
            Cancel
          </AlertDialogCancel>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
