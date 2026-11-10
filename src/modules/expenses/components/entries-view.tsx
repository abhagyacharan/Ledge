"use client";

import { AlertTriangle, CheckCircle2, Clock, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDate } from "@/lib/dates";
import { formatAmount, formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { EntryKind, FinanceEntry } from "@/server/db/schema";
import { run, undoToast } from "@/modules/todos/components/run-action";
import { markEmiPaidAction, restoreEntryAction, trashEntryAction } from "../actions";
import {
  CATEGORIES_BY_KIND,
  EMI_STATUS_LABELS,
  KIND_LABELS,
  TITLE_LABELS,
  DATE_LABELS,
  CATEGORY_LABELS,
} from "../categories";
import { SORT_LABELS, SORTS, type EntrySort } from "../schema";
import { EntryDialog, type EntryFormContext } from "./entry-dialog";

export type EntriesViewProps = {
  kind: EntryKind;
  entries: FinanceEntry[];
  /** "November 2026" */
  periodLabel: string;
  currency: string;
  locale: string;
  today: string;
  filters: { sort: EntrySort; category: string | null; q: string };
  /** Small totals shown under the header (by category, payment method, status ...). */
  summary: { label: string; amountMinor: number }[];
  /** Total of every entry in the period before filters, for the header. */
  periodTotalMinor: number;
};

/** Column layout of a row on a wide screen (one string per kind so Tailwind can see it). */
const GRID: Record<EntryKind, string> = {
  income: "xl:grid-cols-[6.5rem_minmax(0,1fr)_10rem_8rem_5.5rem]",
  emi: "xl:grid-cols-[6.5rem_minmax(0,1fr)_9rem_7.5rem_8rem_9rem]",
  expense: "xl:grid-cols-[6.5rem_minmax(0,1fr)_11rem_7rem_7.5rem_5.5rem]",
  investment: "xl:grid-cols-[6.5rem_minmax(0,1fr)_11rem_8rem_7.5rem_5.5rem]",
};

function HeaderCell({ children, right }: { children: ReactNode; right?: boolean }) {
  return <div className={cn("px-0", right && "text-right")}>{children}</div>;
}

function ColumnHeaders({ kind }: { kind: EntryKind }) {
  // A visual header for wide screens only; each cell also carries its own hidden label.
  return (
    <div
      aria-hidden
      className={cn(
        "hidden gap-3 border-b bg-muted/50 px-3 py-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase xl:grid",
        GRID[kind],
      )}
    >
      <HeaderCell>{DATE_LABELS[kind]}</HeaderCell>
      <HeaderCell>{TITLE_LABELS[kind]}</HeaderCell>
      <HeaderCell>{CATEGORY_LABELS[kind]}</HeaderCell>
      {kind === "expense" ? <HeaderCell>Payment</HeaderCell> : null}
      {kind === "investment" ? <HeaderCell>Platform</HeaderCell> : null}
      <HeaderCell right>Amount</HeaderCell>
      {kind === "emi" ? <HeaderCell>Status</HeaderCell> : null}
      <HeaderCell right>Actions</HeaderCell>
    </div>
  );
}

/** A value with a caption that shows on phones and is read aloud on wide screens. */
function Cell({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0 text-sm", className)}>
      <span className="text-xs text-muted-foreground xl:sr-only">{label}: </span>
      {children}
    </div>
  );
}

function StatusBadge({
  entry,
  today,
  locale,
}: {
  entry: FinanceEntry;
  today: string;
  locale: string;
}) {
  if (entry.status === "paid") {
    return (
      <span className="inline-flex items-center gap-1 text-sm">
        <CheckCircle2 className="size-4 text-inflow" aria-hidden />
        Paid
        {entry.paidOn ? (
          <span className="text-xs text-muted-foreground">
            {" "}
            on {formatDate(entry.paidOn, locale)}
          </span>
        ) : null}
      </span>
    );
  }
  const overdue = entry.status === "scheduled" && entry.entryDate < today;
  if (entry.status === "delayed" || overdue) {
    return (
      <span className="inline-flex items-center gap-1 text-sm font-medium text-destructive">
        <AlertTriangle className="size-4" aria-hidden />
        {entry.status === "delayed" ? "Delayed" : "Overdue"}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-sm">
      <Clock className="size-4 text-muted-foreground" aria-hidden />
      {EMI_STATUS_LABELS.scheduled}
    </span>
  );
}

/**
 * One tab's content (docs/expenses-spec.md): the period's total, a toolbar (category, sort, search),
 * the entries as a table-like list that becomes cards on a phone, and the add and edit dialog.
 */
export function EntriesView(props: EntriesViewProps) {
  const {
    kind,
    entries,
    periodLabel,
    currency,
    locale,
    today,
    filters,
    summary,
    periodTotalMinor,
  } = props;
  const [dialog, setDialog] = useState<{ open: boolean; entry?: FinanceEntry }>({ open: false });
  const context: EntryFormContext = { currency, today };
  const label = KIND_LABELS[kind];
  const filtered = Boolean(filters.category || filters.q);
  const shownTotal = entries.reduce((sum, e) => sum + e.amountMinor, 0);

  async function remove(entry: FinanceEntry) {
    const result = await run(trashEntryAction({ id: entry.id }));
    if (!result.ok) return;
    undoToast(`Deleted "${entry.title}"`, () => void run(restoreEntryAction({ id: entry.id })));
  }

  async function markPaid(entry: FinanceEntry) {
    await run(markEmiPaidAction({ id: entry.id, paidOn: today }), {
      success: `Marked "${entry.title}" as paid`,
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">
            {label.tab} in {periodLabel}
          </h2>
          <p className="text-sm text-muted-foreground" aria-live="polite">
            <span className="font-medium text-foreground tabular-nums">
              {formatMoney(filtered ? shownTotal : periodTotalMinor, currency, locale)}
            </span>{" "}
            across {entries.length} {entries.length === 1 ? "entry" : "entries"}
            {filtered ? " (filtered)" : ""}
          </p>
        </div>
        <Button
          type="button"
          className="h-11 gap-1 md:h-8"
          onClick={() => setDialog({ open: true })}
        >
          <Plus /> Add {label.singular}
        </Button>
      </div>

      {summary.length > 0 ? (
        <ul className="flex flex-wrap gap-2" aria-label="Totals for the period">
          {summary.map((s) => (
            <li key={s.label} className="rounded-full border px-3 py-1 text-xs">
              {s.label}{" "}
              <span className="font-medium tabular-nums">
                {formatMoney(s.amountMinor, currency, locale)}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      <Toolbar kind={kind} filters={filters} />

      {entries.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center">
          <p className="font-medium">
            {filtered ? "No entries match these filters" : `No ${label.plural} in ${periodLabel}`}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {filtered
              ? "Change the filters, or add a new one."
              : "Add the first one to start tracking."}
          </p>
          <div className="mt-4 flex justify-center">
            <Button
              type="button"
              className="h-11 gap-1 md:h-8"
              onClick={() => setDialog({ open: true })}
            >
              <Plus /> Add {label.singular}
            </Button>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border">
          <ColumnHeaders kind={kind} />
          <ul>
            {entries.map((entry) => (
              <li
                key={entry.id}
                className={cn(
                  "flex flex-wrap items-center gap-x-4 gap-y-1 border-b px-3 py-3 last:border-b-0 xl:grid xl:gap-3 xl:py-2",
                  GRID[kind],
                )}
              >
                <Cell
                  label={DATE_LABELS[kind]}
                  className="text-muted-foreground tabular-nums xl:text-foreground"
                >
                  {formatDate(entry.entryDate, locale)}
                </Cell>

                <div className="order-first w-full min-w-0 xl:order-none xl:w-auto">
                  <button
                    type="button"
                    onClick={() => setDialog({ open: true, entry })}
                    aria-label={`Edit ${entry.title}`}
                    className="min-h-11 max-w-full rounded-md text-left text-sm font-medium break-words underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 md:min-h-0"
                  >
                    {entry.title}
                  </button>
                  {kind === "emi" && entry.lender ? (
                    <p className="text-xs break-words text-muted-foreground">
                      Lender: {entry.lender}
                    </p>
                  ) : null}
                  {entry.notes ? (
                    <p className="text-xs break-words text-muted-foreground">{entry.notes}</p>
                  ) : null}
                </div>

                <Cell label={CATEGORY_LABELS[kind]}>
                  {entry.category}
                  {kind === "emi" && entry.emiType ? (
                    <span className="block text-xs text-muted-foreground">{entry.emiType}</span>
                  ) : null}
                </Cell>
                {kind === "expense" ? (
                  <Cell label="Payment">{entry.paymentMethod ?? "Other"}</Cell>
                ) : null}
                {kind === "investment" ? (
                  <Cell label="Platform">
                    {entry.platform ?? <span className="text-muted-foreground">None</span>}
                  </Cell>
                ) : null}

                <Cell
                  label="Amount"
                  className="ml-auto font-medium tabular-nums xl:ml-0 xl:text-right"
                >
                  {formatAmount(entry.amountMinor, currency, locale)}
                </Cell>

                {kind === "emi" ? (
                  <Cell label="Status">
                    <StatusBadge entry={entry} today={today} locale={locale} />
                  </Cell>
                ) : null}

                <div className="flex items-center justify-end gap-1">
                  {kind === "emi" && entry.status !== "paid" ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="h-11 md:h-8"
                      onClick={() => void markPaid(entry)}
                      aria-label={`Mark paid: ${entry.title}`}
                    >
                      Mark paid
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-11 md:size-8"
                    aria-label={`Edit ${entry.title} details`}
                    onClick={() => setDialog({ open: true, entry })}
                  >
                    <Pencil />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-11 text-destructive md:size-8"
                    aria-label={`Delete ${entry.title}`}
                    onClick={() => void remove(entry)}
                  >
                    <Trash2 />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <EntryDialog
        open={dialog.open}
        onOpenChange={(open) => setDialog((d) => ({ ...d, open }))}
        kind={kind}
        entry={dialog.entry}
        context={context}
      />
    </div>
  );
}

const ANY = "all";

/** Category filter, sort and search. They live in the URL, next to the period. */
function Toolbar({
  kind,
  filters,
}: {
  kind: EntryKind;
  filters: { sort: EntrySort; category: string | null; q: string };
}) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const [q, setQ] = useState(filters.q);

  function update(patch: Record<string, string | null>) {
    const next = new URLSearchParams(search.toString());
    for (const [key, value] of Object.entries(patch)) {
      if (value === null || value === "") next.delete(key);
      else next.set(key, value);
    }
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  function onSearch(event: FormEvent) {
    event.preventDefault();
    update({ q: q.trim() || null });
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="entries-category">{CATEGORY_LABELS[kind]}</Label>
        <Select
          value={filters.category ?? ANY}
          onValueChange={(v) => update({ cat: v === ANY ? null : v })}
        >
          <SelectTrigger id="entries-category" className="h-11 w-52 md:h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>
              All {kind === "investment" ? "types" : "categories"}
            </SelectItem>
            {CATEGORIES_BY_KIND[kind].map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="entries-sort">Sort by</Label>
        <Select
          value={filters.sort}
          onValueChange={(v) => update({ sort: v === "newest" ? null : v })}
        >
          <SelectTrigger id="entries-sort" className="h-11 w-44 md:h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORTS.map((s) => (
              <SelectItem key={s} value={s}>
                {SORT_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <form onSubmit={onSearch} role="search" className="flex flex-1 items-end gap-2">
        <div className="flex min-w-40 flex-1 flex-col gap-1.5">
          <Label htmlFor="entries-search">Search</Label>
          <div className="relative">
            <Search
              aria-hidden
              className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              id="entries-search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onBlur={() => q.trim() !== filters.q && update({ q: q.trim() || null })}
              placeholder="Name or notes"
              maxLength={100}
              className="h-11 pl-8 md:h-8"
            />
          </div>
        </div>
        <Button type="submit" variant="outline" className="h-11 md:h-8">
          Search
        </Button>
      </form>
    </div>
  );
}
