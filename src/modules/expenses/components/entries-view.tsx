"use client";

import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Ellipsis,
  Pencil,
  Search,
  StickyNote,
  CalendarDays,
  Trash2,
  X,
} from "lucide-react";
import { AnimatePresence, motion, type Transition } from "motion/react";
import { useEffect, useOptimistic, useRef, useState, useTransition, type FormEvent } from "react";
import { DashButton, dashButton } from "@/components/dash/dash-button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDayHeading, formatDueDate } from "@/lib/dates";
import { formatAmount, formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { EntryKind, FinanceEntry } from "@/server/db/schema";
import { run, undoToast } from "@/modules/todos/components/run-action";
import { markEmiPaidAction, restoreEntryAction, trashEntryAction } from "../actions";
import { CATEGORIES_BY_KIND, KIND_LABELS } from "../categories";
import { CategoryIcon } from "../category-icons";
import {
  emiState,
  groupByDay,
  groupsByDay,
  presentCategories,
  type EmiState,
} from "../entries-logic";
import { SORT_LABELS, SORTS, type ParsedEntryFilters, type EntrySort } from "../schema";
import { SPEND_LABEL_NAMES } from "../categories";
import { EntriesBreakdown, EntriesOverview, type Breakdown } from "./entries-overview";
import { EntrySheet } from "./entry-sheet";
import { usePending, useQueryUpdate } from "./pending";
import { useLogTransaction } from "./transaction-launcher";

export type { Breakdown };

type Filters = ParsedEntryFilters;
type Fmt = { currency: string; locale: string };

export type EntriesViewProps = {
  kind: EntryKind;
  entries: FinanceEntry[];
  /** "November 2026" */
  periodLabel: string;
  /** "y=2026&m=11": changes when the period does. */
  periodKey: string;
  currency: string;
  locale: string;
  today: string;
  filters: Filters;
  breakdown: Breakdown;
  /** Total and count of every entry in the period, before filters. */
  periodTotalMinor: number;
  periodCount: number;
  /** Categories that appear in the period (for the filter chips). */
  categoriesUsed: string[];
  /** Whether any expense in the period has a need or want label (shows the label chips). */
  labelsUsed: boolean;
};

type Change = { type: "remove"; id: string } | { type: "paid"; id: string; today: string };

/** Rows fold away when deleted and unfold when added (or brought back with Undo). */
const ROW_MOTION: Transition = { duration: 0.22, ease: [0.23, 1, 0.32, 1] };

/**
 * One entries tab (docs/expenses-spec.md, docs/design.md): an overview card with the period's
 * total, and one list card with search, sort, category chips and the entries. Tapping a row opens
 * it in a sheet; on wide screens a quiet menu on each row offers edit, mark paid and delete.
 */
export function EntriesView(props: EntriesViewProps) {
  const { kind, entries, periodLabel, currency, locale, today, filters } = props;
  const fmt = { currency, locale };
  const label = KIND_LABELS[kind];
  // The sheet here edits; adding goes through the shared "Log a transaction" launcher.
  const [sheet, setSheet] = useState<{ open: boolean; entry?: FinanceEntry }>({ open: false });
  const launcher = useLogTransaction();
  const [, startTransition] = useTransition();
  // Deletes and "mark paid" show at once; the server's answer replaces them a moment later.
  const [shown, change] = useOptimistic(entries, (list, c: Change) =>
    c.type === "remove"
      ? list.filter((e) => e.id !== c.id)
      : list.map((e) =>
          e.id === c.id ? { ...e, status: "paid" as const, paidOn: e.paidOn ?? c.today } : e,
        ),
  );

  const filtered = Boolean(filters.category || filters.q || filters.label || filters.day);
  const shownTotal = shown.reduce((sum, e) => sum + e.amountMinor, 0);

  const openNew = () => launcher.open(kind);
  const openEntry = (entry: FinanceEntry) => setSheet({ open: true, entry });

  function remove(entry: FinanceEntry) {
    startTransition(async () => {
      change({ type: "remove", id: entry.id });
      const result = await run(trashEntryAction({ id: entry.id }));
      if (!result.ok) return;
      undoToast(`Deleted "${entry.title}"`, () => void run(restoreEntryAction({ id: entry.id })));
    });
  }

  function markPaid(entry: FinanceEntry) {
    startTransition(async () => {
      change({ type: "paid", id: entry.id, today });
      await run(markEmiPaidAction({ id: entry.id, paidOn: today }), {
        success: `Marked "${entry.title}" as paid`,
      });
    });
  }

  return (
    // Phone order: total, list, breakdown. Wide screens: total and breakdown on the left, list on the right.
    <div className="dash grid gap-4 pb-20 xl:grid-cols-12 xl:grid-rows-[auto_1fr] xl:items-start">
      <h2 className="sr-only">
        {label.tab} in {periodLabel}
      </h2>

      <EntriesOverview
        kind={kind}
        periodLabel={periodLabel}
        totalMinor={props.periodTotalMinor}
        count={props.periodCount}
        fmt={fmt}
        onAdd={openNew}
        className="xl:col-span-4 xl:row-start-1"
      />

      <section
        aria-labelledby="entries-title"
        className="min-w-0 rounded-2xl border border-dash-edge bg-dash-card px-4 py-5 shadow-(--dash-card-shadow) sm:p-5 md:rounded-3xl text-dash-ink md:p-6 xl:col-span-8 xl:col-start-5 xl:row-span-2 xl:row-start-1"
      >
        <h3 id="entries-title" className="sr-only">
          Entries
        </h3>
        <Toolbar
          kind={kind}
          filters={filters}
          today={today}
          locale={locale}
          showLabels={kind === "expense" && (props.labelsUsed || filters.label !== null)}
          categories={presentCategories(
            props.categoriesUsed,
            CATEGORIES_BY_KIND[kind],
            filters.category,
          )}
          result={
            filtered
              ? `${shown.length} of ${props.periodCount} shown · ${formatMoney(shownTotal, currency, locale)}`
              : null
          }
        />

        {shown.length === 0 ? (
          <EmptyState
            kind={kind}
            filtered={filtered}
            dayOnly={
              filters.day && !filters.category && !filters.q && !filters.label
                ? formatDayHeading(filters.day, today, locale)
                : null
            }
            periodLabel={periodLabel}
            onAdd={openNew}
          />
        ) : (
          // A new period or filter is a new list: it appears without replaying row animations.
          <EntryList
            key={`${props.periodKey}|${filters.sort}|${filters.category}|${filters.q}|${filters.label}|${filters.day}`}
            kind={kind}
            entries={shown}
            grouped={kind === "expense" && groupsByDay(filters.sort)}
            today={today}
            fmt={fmt}
            onOpen={openEntry}
            onDelete={remove}
            onMarkPaid={markPaid}
          />
        )}
      </section>

      <EntriesBreakdown
        breakdown={props.breakdown}
        fmt={fmt}
        className="xl:col-span-4 xl:row-start-2"
      />

      <EntrySheet
        formKey={sheet.entry?.id ?? "none"}
        open={sheet.open}
        onOpenChange={(open) => setSheet((s) => ({ ...s, open }))}
        kind={kind}
        entry={sheet.entry}
        context={{ currency, today }}
        onDelete={(entry) => {
          setSheet((s) => ({ ...s, open: false }));
          remove(entry);
        }}
        onMarkPaid={(entry) => {
          setSheet((s) => ({ ...s, open: false }));
          markPaid(entry);
        }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------------------------------ */
/* Toolbar: search, sort, and the category chips. Every choice lives in the address.          */

function Toolbar({
  kind,
  filters,
  today,
  locale,
  showLabels,
  categories,
  result,
}: {
  kind: EntryKind;
  filters: Filters;
  today: string;
  locale: string;
  showLabels: boolean;
  categories: string[];
  result: string | null;
}) {
  const update = useQueryUpdate();
  const { pending } = usePending();
  const [q, setQ] = useState(filters.q);
  // The chips and the sort answer at once; the list follows when the server does.
  const [category, setCategory] = useOptimistic(filters.category);
  const [sort, setSort] = useOptimistic(filters.sort);
  const [spendLabel, setSpendLabel] = useOptimistic(filters.label);
  const lastSent = useRef(filters.q);
  const updateRef = useRef(update);
  useEffect(() => {
    updateRef.current = update;
  });

  // Search as you type, a moment after the last key.
  useEffect(() => {
    const text = q.trim();
    if (text === lastSent.current) return;
    const timer = setTimeout(() => {
      lastSent.current = text;
      updateRef.current({ q: text || null });
    }, 300);
    return () => clearTimeout(timer);
  }, [q]);

  function submit(event: FormEvent) {
    event.preventDefault();
    const text = q.trim();
    lastSent.current = text;
    update({ q: text || null });
  }

  function clearAll() {
    setQ("");
    lastSent.current = "";
    update({ q: null, cat: null, label: null, day: null }, () => {
      setCategory(null);
      setSpendLabel(null);
    });
  }

  const anyLabel = kind === "investment" ? "All types" : "All";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <form role="search" onSubmit={submit} className="relative min-w-0 flex-1">
          <label htmlFor="entries-search" className="sr-only">
            Search
          </label>
          <Search
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-dash-ink-soft"
          />
          <input
            id="entries-search"
            type="search"
            enterKeyHint="search"
            autoComplete="off"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search"
            maxLength={100}
            className="h-11 w-full rounded-full bg-dash-well pr-10 pl-10 text-base text-dash-ink outline-none placeholder:text-dash-ink-soft focus-visible:ring-3 focus-visible:ring-ring/50 md:h-9 md:text-sm [&::-webkit-search-cancel-button]:hidden"
          />
          {q ? (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => {
                setQ("");
                lastSent.current = "";
                update({ q: null });
              }}
              className="absolute top-1/2 right-0 grid size-11 -translate-y-1/2 place-items-center rounded-full text-dash-ink-soft outline-none hover:text-dash-ink focus-visible:ring-3 focus-visible:ring-ring/50 md:size-9"
            >
              <X className="size-4" />
            </button>
          ) : null}
        </form>

        <Select
          value={sort}
          onValueChange={(v) => {
            const next = v as EntrySort;
            update({ sort: next === "newest" ? null : next }, () => setSort(next));
          }}
        >
          <SelectTrigger
            aria-label="Sort by"
            className="h-11! shrink-0 gap-1.5 rounded-full border-dash-edge bg-dash-card px-3.5 text-sm text-dash-ink md:h-9! dark:bg-dash-card"
          >
            <SelectValue>{SORT_LABELS[sort]}</SelectValue>
          </SelectTrigger>
          <SelectContent align="end">
            {SORTS.map((s) => (
              <SelectItem key={s} value={s}>
                {SORT_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filters.day ? (
        <div className="flex">
          <button
            type="button"
            onClick={() => update({ day: null })}
            aria-label={`Showing ${formatDayHeading(filters.day, today, locale)} only. Show the whole period`}
            className="inline-flex h-11 items-center gap-2 rounded-full bg-dash-ink pr-2.5 pl-3.5 text-[13px] font-medium text-dash-card outline-none transition-transform duration-150 ease-snap focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-[0.97] md:h-8"
          >
            <CalendarDays aria-hidden className="size-3.5" />
            {formatDayHeading(filters.day, today, locale)}
            <X aria-hidden className="size-3.5" />
          </button>
        </div>
      ) : null}

      {showLabels ? (
        <div role="group" aria-label="Need or want" className="flex gap-2">
          {([null, "need", "want"] as const).map((l) => {
            const active = spendLabel === l;
            return (
              <button
                key={l ?? "any"}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  if (active) return;
                  update({ label: l }, () => setSpendLabel(l));
                }}
                className={cn(
                  "h-11 shrink-0 rounded-full px-3.5 text-[13px] font-medium whitespace-nowrap outline-none transition-[transform,background-color,color] duration-150 ease-snap focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-[0.97] md:h-8",
                  active
                    ? "bg-dash-ink text-dash-card"
                    : "bg-dash-well text-dash-ink hover:bg-dash-edge",
                )}
              >
                {l ? SPEND_LABEL_NAMES[l].plural : "Any"}
              </button>
            );
          })}
        </div>
      ) : null}

      {categories.length > 1 || category ? (
        <div
          role="group"
          aria-label="Category"
          className="dash-fade-x no-scrollbar -mx-4 flex gap-2 overflow-x-auto overscroll-x-contain px-4 sm:-mx-5 sm:px-5 md:-mx-6 md:px-6"
        >
          {[null, ...categories].map((c) => {
            const active = category === c;
            return (
              <button
                key={c ?? "all"}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  if (active) return;
                  update({ cat: c }, () => setCategory(c));
                }}
                className={cn(
                  "h-11 shrink-0 rounded-full px-3.5 text-[13px] font-medium whitespace-nowrap outline-none transition-[transform,background-color,color] duration-150 ease-snap focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-[0.97] md:h-8",
                  active
                    ? "bg-dash-ink text-dash-card"
                    : "bg-dash-well text-dash-ink hover:bg-dash-edge",
                )}
              >
                {c ?? anyLabel}
              </button>
            );
          })}
        </div>
      ) : null}

      <div aria-live="polite" className="min-h-0 text-[13px] text-dash-ink-soft empty:hidden">
        {result ? (
          <p className="flex flex-wrap items-center justify-between gap-x-3">
            <span>
              {result}
              {pending ? <span className="sr-only"> (updating)</span> : null}
            </span>
            <button
              type="button"
              onClick={clearAll}
              className="min-h-11 rounded-full font-medium text-dash-ink underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 md:min-h-0"
            >
              Clear filters
            </button>
          </p>
        ) : null}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------------------------------ */
/* The list.                                                                                   */

type RowActions = {
  onOpen: (entry: FinanceEntry) => void;
  onDelete: (entry: FinanceEntry) => void;
  onMarkPaid: (entry: FinanceEntry) => void;
};

function EntryList({
  kind,
  entries,
  grouped,
  today,
  fmt,
  ...actions
}: {
  kind: EntryKind;
  entries: FinanceEntry[];
  grouped: boolean;
  today: string;
  fmt: Fmt;
} & RowActions) {
  const row = (entry: FinanceEntry, showDate: boolean) => (
    <motion.li
      key={entry.id}
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={ROW_MOTION}
      className="overflow-hidden"
    >
      <EntryRow
        kind={kind}
        entry={entry}
        showDate={showDate}
        today={today}
        fmt={fmt}
        {...actions}
      />
    </motion.li>
  );

  if (!grouped) {
    return (
      <ul className="mt-2 -mb-2">
        <AnimatePresence initial={false}>{entries.map((e) => row(e, true))}</AnimatePresence>
      </ul>
    );
  }

  return (
    <div className="mt-1 -mb-2">
      <AnimatePresence initial={false}>
        {groupByDay(entries).map((group) => (
          <motion.section
            key={group.date}
            aria-label={formatDayHeading(group.date, today, fmt.locale)}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={ROW_MOTION}
            className="overflow-hidden"
          >
            <div className="flex items-baseline justify-between gap-3 pt-4 pb-1 md:pr-12">
              <h4 className="text-[13px] font-medium text-dash-ink-soft">
                {formatDayHeading(group.date, today, fmt.locale)}
              </h4>
              <span className="figures text-xs text-dash-ink-soft">
                {formatMoney(group.totalMinor, fmt.currency, fmt.locale)}
              </span>
            </div>
            <ul>
              <AnimatePresence initial={false}>
                {group.entries.map((e) => row(e, false))}
              </AnimatePresence>
            </ul>
          </motion.section>
        ))}
      </AnimatePresence>
    </div>
  );
}

function EntryRow({
  kind,
  entry,
  showDate,
  today,
  fmt,
  onOpen,
  onDelete,
  onMarkPaid,
}: {
  kind: EntryKind;
  entry: FinanceEntry;
  showDate: boolean;
  today: string;
  fmt: Fmt;
} & RowActions) {
  const state = kind === "emi" ? emiState(entry, today) : null;
  const unpaid = state !== null && state !== "paid";
  const date = formatDueDate(entry.entryDate, today, fmt.locale);

  const meta = [
    entry.category,
    kind === "expense" ? entry.paymentMethod : null,
    kind === "expense" && entry.spendLabel ? SPEND_LABEL_NAMES[entry.spendLabel].one : null,
    kind === "investment" ? entry.platform : null,
    kind === "emi" ? entry.lender : null,
    showDate ? (kind === "emi" ? `Due ${date}` : date) : null,
  ].filter(Boolean);

  return (
    <div className="group/row relative -mx-2 flex min-h-15 items-center gap-3 rounded-2xl px-2 py-2.5 transition-colors duration-150 has-[>button:first-child:active]:bg-dash-well hover:bg-dash-well/70">
      {/* The whole row opens the entry. Other controls sit above this button. */}
      <button
        type="button"
        aria-label={`Edit ${entry.title}`}
        onClick={() => onOpen(entry)}
        className="absolute inset-0 rounded-2xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      />
      <span
        aria-hidden
        className="grid size-10 shrink-0 place-items-center rounded-full bg-dash-well text-dash-ink transition-colors duration-150 group-hover/row:bg-dash-card"
      >
        <CategoryIcon
          kind={kind}
          category={entry.category}
          className="size-[18px]"
          strokeWidth={1.75}
        />
      </span>

      <div className="pointer-events-none min-w-0 flex-1">
        <p data-entry-title className="truncate text-sm font-medium">
          {entry.title}
        </p>
        <p className="flex items-center gap-1.5 text-[13px] text-dash-ink-soft">
          <span className="truncate">{meta.join(" · ")}</span>
          {entry.notes ? (
            <>
              <StickyNote aria-hidden className="size-3.5 shrink-0" />
              <span className="sr-only">Has a note: {entry.notes}</span>
            </>
          ) : null}
        </p>
      </div>

      <div className="pointer-events-none flex shrink-0 flex-col items-end gap-1">
        <span className="figures text-sm font-medium">
          {formatAmount(entry.amountMinor, fmt.currency, fmt.locale)}
        </span>
        {state ? <EmiStatusPill state={state} /> : null}
      </div>

      {/* EMIs keep a fixed slot for "Mark paid", so every amount lines up in one column. */}
      {state ? (
        <div className="hidden w-28 shrink-0 justify-end md:flex">
          {unpaid ? (
            <DashButton
              variant="secondary"
              size="sm"
              className="relative"
              aria-label={`Mark paid: ${entry.title}`}
              onClick={() => onMarkPaid(entry)}
            >
              <CheckCircle2 />
              Mark paid
            </DashButton>
          ) : null}
        </div>
      ) : null}

      <RowMenu
        entry={entry}
        canMarkPaid={unpaid}
        onOpen={onOpen}
        onDelete={onDelete}
        onMarkPaid={onMarkPaid}
      />
    </div>
  );
}

/** Wide screens: edit, mark paid and delete behind one quiet button (phones use the sheet). */
function RowMenu({
  entry,
  canMarkPaid,
  onOpen,
  onDelete,
  onMarkPaid,
}: { entry: FinanceEntry; canMarkPaid: boolean } & RowActions) {
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger
        aria-label={`More actions for ${entry.title}`}
        className={cn(
          dashButton({ variant: "ghost", size: "icon" }),
          "relative hidden md:inline-flex md:opacity-0 md:group-hover/row:opacity-100 md:focus-visible:opacity-100 md:data-[state=open]:opacity-100 [@media(hover:none)]:md:opacity-100",
        )}
      >
        <Ellipsis />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem onSelect={() => onOpen(entry)}>
          <Pencil /> Edit
        </DropdownMenuItem>
        {canMarkPaid ? (
          <DropdownMenuItem onSelect={() => onMarkPaid(entry)}>
            <CheckCircle2 /> Mark paid
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={() => onDelete(entry)}>
          <Trash2 /> Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const PILL: Record<EmiState, { label: string; icon: typeof Clock; tone: string }> = {
  paid: { label: "Paid", icon: CheckCircle2, tone: "bg-dash-good-bg text-dash-good" },
  overdue: { label: "Overdue", icon: AlertTriangle, tone: "bg-dash-bad-bg text-dash-bad" },
  delayed: { label: "Delayed", icon: AlertTriangle, tone: "bg-dash-bad-bg text-dash-bad" },
  scheduled: { label: "Scheduled", icon: Clock, tone: "bg-dash-well text-dash-ink-soft" },
};

/** Icon and word, never colour alone (docs/design.md §6). */
function EmiStatusPill({ state }: { state: EmiState }) {
  const { label, icon: Icon, tone } = PILL[state];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
        tone,
      )}
    >
      <Icon className="size-3" aria-hidden />
      {label}
    </span>
  );
}

function EmptyState({
  kind,
  filtered,
  dayOnly,
  periodLabel,
  onAdd,
}: {
  kind: EntryKind;
  filtered: boolean;
  /** The day's heading when the only filter is one day (from the journal). */
  dayOnly: string | null;
  periodLabel: string;
  onAdd: () => void;
}) {
  const label = KIND_LABELS[kind];
  if (dayOnly) {
    return (
      <div className="flex flex-col items-center px-4 py-12 text-center">
        <span
          aria-hidden
          className="mb-4 grid size-12 place-items-center rounded-full bg-dash-well text-dash-good"
        >
          <CategoryIcon kind={kind} category="" className="size-5" strokeWidth={1.75} />
        </span>
        <p className="font-medium text-balance">
          No {label.plural} on {dayOnly}
        </p>
        <p className="mt-1 max-w-xs text-sm text-pretty text-dash-ink-soft">
          {kind === "expense"
            ? "A no-spend day. Tap the date above to see the whole month."
            : "Tap the date above to see the whole month."}
        </p>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center px-4 py-12 text-center">
      <span
        aria-hidden
        className="mb-4 grid size-12 place-items-center rounded-full bg-dash-well text-dash-ink-soft"
      >
        {filtered ? (
          <Search className="size-5" strokeWidth={1.75} />
        ) : (
          <CategoryIcon kind={kind} category="" className="size-5" strokeWidth={1.75} />
        )}
      </span>
      <p className="font-medium text-balance">
        {filtered ? "No entries match these filters" : `No ${label.plural} in ${periodLabel}`}
      </p>
      <p className="mt-1 max-w-xs text-sm text-pretty text-dash-ink-soft">
        {filtered
          ? "Try another word or category, or clear the filters above."
          : "Add the first one and it will show up here."}
      </p>
      {filtered ? null : (
        <div className="mt-5">
          <DashButton variant="secondary" onClick={onAdd}>
            Add {label.singular}
          </DashButton>
        </div>
      )}
    </div>
  );
}
