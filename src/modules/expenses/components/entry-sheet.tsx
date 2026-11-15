"use client";

import { Check, CheckCircle2, ChevronDown, Minus, Plus, Trash2 } from "lucide-react";
import { useId, useRef, useState, useTransition, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";
import { DashButton } from "@/components/dash/dash-button";
import { Sheet, SheetBody, SheetFooter, SheetHeader } from "@/components/dash/sheet";
import { addDaysIso } from "@/lib/dates";
import { minorToInput } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { EntryKind, FinanceEntry, SpendLabel } from "@/server/db/schema";
import { createEntryAction, updateEntryAction } from "../actions";
import {
  CATEGORIES_BY_KIND,
  CATEGORY_LABELS,
  DATE_LABELS,
  EMI_STATUS_LABELS,
  EMI_TYPES,
  KIND_LABELS,
  PAYMENT_METHODS,
  TITLE_LABELS,
  SPEND_LABEL_NAMES,
  SPEND_LABEL_OPTIONS,
} from "../categories";
import { CategoryIcon } from "../category-icons";
import { MAX_EXTRA_MONTHS } from "../emi-series";
import { QUICK_ADD_EVENT } from "@/modules/todos/components/quick-add-button";

export type EntryFormContext = { currency: string; today: string };

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kind: EntryKind;
  /** Pass an entry to edit it; omit to add a new one. */
  entry?: FinanceEntry;
  context: EntryFormContext;
  onDelete?: (entry: FinanceEntry) => void;
  onMarkPaid?: (entry: FinanceEntry) => void;
  /** A button for the "Added" toast (such as "View" when the entry lands elsewhere), given its date. */
  addedAction?: (entryDate: string) => { label: string; onClick: () => void } | undefined;
  /** Changes whenever the form should start over (a new entry, or another entry to edit). */
  formKey: string;
  /** New entries: the type row at the top switches kind, or hands over to quick add (Task). */
  onKindChange?: (kind: EntryKind) => void;
  /** New entries start on this day instead of today. */
  defaultDate?: string;
};

/** The type row (docs/new_design.md screen 1c): Task first, then the money kinds. */
const TYPES: { value: EntryKind | "task"; label: string }[] = [
  { value: "task", label: "Task" },
  { value: "expense", label: "Expense" },
  { value: "income", label: "Income" },
  { value: "emi", label: "EMI or loan" },
  { value: "investment", label: "Investment" },
];

/** The last category and payment method used, per kind, on this device (a convenience only). */
function readLast(kind: EntryKind): { category?: string; paymentMethod?: string } {
  try {
    const raw = window.localStorage.getItem(`ledge:last-${kind}`);
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? (parsed as Record<string, string>) : {};
  } catch {
    return {};
  }
}
function writeLast(kind: EntryKind, value: { category: string; paymentMethod: string }) {
  try {
    window.localStorage.setItem(`ledge:last-${kind}`, JSON.stringify(value));
  } catch {
    // Storage blocked: nothing to remember.
  }
}

/** Text fields in the dashboard look. 16px text on phones so iOS does not zoom in. */
const field =
  "h-11 w-full rounded-xl border border-dash-edge bg-dash-card px-3.5 text-base text-dash-ink outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-dash-ink-soft focus-visible:border-dash-ink/40 focus-visible:ring-3 focus-visible:ring-ring/40 aria-invalid:border-dash-bad md:h-10 md:text-sm";

/**
 * Add or edit one entry, in a sheet (docs/expenses-spec.md for the fields per kind). The amount
 * comes first and large, because it is what you type most; choices are chips you tap, not menus.
 */
export function EntrySheet({
  open,
  onOpenChange,
  kind,
  entry,
  context,
  onDelete,
  onMarkPaid,
  addedAction,
  formKey,
  onKindChange,
  defaultDate,
}: Props) {
  const amountRef = useRef<HTMLInputElement>(null);
  const editing = Boolean(entry);
  const label = KIND_LABELS[kind].singular;
  return (
    <Sheet open={open} onOpenChange={onOpenChange} initialFocus={editing ? true : amountRef}>
      <EntryForm
        key={formKey}
        kind={kind}
        entry={entry}
        context={context}
        amountRef={amountRef}
        close={() => onOpenChange(false)}
        title={`${editing ? "Edit" : "Add"} ${label}`}
        onDelete={onDelete}
        onMarkPaid={onMarkPaid}
        addedAction={addedAction}
        onKindChange={editing ? undefined : onKindChange}
        defaultDate={defaultDate}
      />
    </Sheet>
  );
}

function EntryForm({
  kind,
  entry,
  context,
  amountRef,
  close,
  title: sheetTitle,
  onDelete,
  onMarkPaid,
  addedAction,
  onKindChange,
  defaultDate,
}: {
  onKindChange?: (kind: EntryKind) => void;
  defaultDate?: string;
  kind: EntryKind;
  entry?: FinanceEntry;
  context: EntryFormContext;
  amountRef: React.RefObject<HTMLInputElement | null>;
  close: () => void;
  title: string;
  onDelete?: (entry: FinanceEntry) => void;
  onMarkPaid?: (entry: FinanceEntry) => void;
  addedAction?: (entryDate: string) => { label: string; onClick: () => void } | undefined;
}) {
  const editing = Boolean(entry);
  const [entryDate, setEntryDate] = useState(entry?.entryDate ?? defaultDate ?? context.today);
  const [title, setTitle] = useState(entry?.title ?? "");
  const [last] = useState(() => (entry ? {} : readLast(kind)));
  const [category, setCategory] = useState(entry?.category ?? last.category ?? "");
  const [amount, setAmount] = useState(
    entry ? minorToInput(entry.amountMinor, context.currency) : "",
  );
  const [notes, setNotes] = useState(entry?.notes ?? "");
  const [paymentMethod, setPaymentMethod] = useState(
    entry?.paymentMethod ?? last.paymentMethod ?? "",
  );
  const [showNotes, setShowNotes] = useState(Boolean(entry?.notes));
  const another = useRef(false);
  const [spendLabel, setSpendLabel] = useState<string>(entry?.spendLabel ?? "");
  const [lender, setLender] = useState(entry?.lender ?? "");
  const [emiType, setEmiType] = useState(entry?.emiType ?? "");
  const [status, setStatus] = useState<string>(entry?.status ?? "scheduled");
  const [paidOn, setPaidOn] = useState(entry?.paidOn ?? "");
  const [platform, setPlatform] = useState(entry?.platform ?? "");
  const [repeat, setRepeat] = useState("0");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const label = KIND_LABELS[kind].singular;
  const symbol = context.currency === "INR" ? "₹" : context.currency;

  function payload() {
    const base = { entryDate, title, category, amount, notes };
    switch (kind) {
      case "income":
        return { kind, ...base };
      case "expense":
        return { kind, ...base, paymentMethod, spendLabel };
      case "investment":
        return { kind, ...base, platform };
      case "emi":
        return {
          kind,
          ...base,
          lender,
          emiType,
          status,
          paidOn: status === "paid" ? paidOn || context.today : null,
          ...(editing ? {} : { repeatMonths: Number(repeat) || 0 }),
        };
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    startTransition(async () => {
      try {
        const result = entry
          ? await updateEntryAction({ id: entry.id, ...payload() })
          : await createEntryAction(payload());
        if (!result.ok) {
          setErrors(result.fieldErrors ?? {});
          setFormError(result.fieldErrors ? null : result.error);
          return;
        }
        const created = !entry && result.data && "created" in result.data ? result.data.created : 1;
        if (!entry) writeLast(kind, { category, paymentMethod });
        toast.success(
          entry
            ? "Saved"
            : created > 1
              ? `Added ${created} ${KIND_LABELS.emi.plural}`
              : `Added "${title.trim()}"`,
          entry || !addedAction ? undefined : { action: addedAction(entryDate) },
        );
        if (!entry && another.current) {
          // Ready for the next one: keep the type, category, method and date.
          another.current = false;
          setAmount("");
          setTitle("");
          setNotes("");
          setErrors({});
          amountRef.current?.focus();
          return;
        }
        close();
      } catch {
        setFormError("Couldn't reach the server. Check your connection and try again.");
      }
    });
  }

  const showQuickDates = kind !== "emi";
  const yesterday = addDaysIso(context.today, -1);
  const canMarkPaid = kind === "emi" && entry && entry.status !== "paid" && onMarkPaid;

  return (
    <form onSubmit={submit} noValidate className="flex min-h-0 flex-1 flex-col">
      <SheetHeader
        title={sheetTitle}
        description={kind === "emi" ? "Its due date decides which month it belongs to." : undefined}
      />

      <SheetBody>
        <div className="flex flex-col gap-5">
          {onKindChange ? (
            <div
              role="radiogroup"
              aria-label="Type"
              className="no-scrollbar -mx-4 -mt-1 flex gap-2 overflow-x-auto px-4 sm:-mx-6 sm:px-6"
            >
              {TYPES.map((t) => {
                const on = t.value === kind;
                return (
                  <button
                    key={t.value}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => {
                      if (on) return;
                      if (t.value === "task") {
                        close();
                        window.dispatchEvent(new Event(QUICK_ADD_EVENT));
                      } else onKindChange(t.value);
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
          ) : null}

          {/* The amount: the one big field, no box (screen 1c). */}
          <div>
            <label htmlFor="entry-amount" className="sr-only">
              Amount
            </label>
            <div
              className={cn(
                "flex items-baseline gap-2 rounded-2xl",
                errors.amount && "ring-2 ring-dash-bad ring-offset-4 ring-offset-dash-card",
              )}
            >
              <span aria-hidden className="font-display text-[28px] text-dash-ink-soft">
                {symbol}
              </span>
              <input
                ref={amountRef}
                id="entry-amount"
                inputMode="decimal"
                enterKeyHint="next"
                autoComplete="off"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                aria-invalid={errors.amount ? true : undefined}
                aria-describedby={errors.amount ? "entry-amount-error" : undefined}
                className="h-16 w-full min-w-0 bg-transparent font-display text-[52px] leading-none font-semibold tracking-tight text-dash-ink tabular-nums caret-dash-accent outline-none placeholder:text-dash-ink-soft/40"
              />
            </div>
            <FieldError id="entry-amount-error" error={errors.amount} />
          </div>

          <Field id="entry-title" label={TITLE_LABELS[kind]} error={errors.title} hideLabel>
            <input
              id="entry-title"
              placeholder={TITLE_LABELS[kind]}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              enterKeyHint="next"
              className={cn(field, "h-12 bg-dash-well border-transparent md:h-11")}
              aria-invalid={errors.title ? true : undefined}
              aria-describedby={errors.title ? "entry-title-error" : undefined}
            />
          </Field>

          <ChoiceGroup
            id="entry-category"
            label={CATEGORY_LABELS[kind]}
            value={category}
            onChange={setCategory}
            options={CATEGORIES_BY_KIND[kind]}
            iconKind={kind}
            error={errors.category}
            limit={3}
          />

          {kind === "expense" ? (
            <ChoiceGroup
              id="entry-payment"
              label="Payment method"
              value={paymentMethod}
              onChange={setPaymentMethod}
              options={PAYMENT_METHODS}
              error={errors.paymentMethod}
            />
          ) : null}

          {kind === "expense" ? (
            <ChoiceGroup
              id="entry-spend-label"
              label="Need or want (optional)"
              hint="Tap again to clear."
              value={spendLabel}
              onChange={setSpendLabel}
              options={SPEND_LABEL_OPTIONS}
              optionLabel={(o) => SPEND_LABEL_NAMES[o as SpendLabel].one}
              clearable
              error={errors.spendLabel}
            />
          ) : null}

          {kind === "emi" ? (
            <>
              <ChoiceGroup
                id="entry-emi-type"
                label="Type"
                value={emiType}
                onChange={setEmiType}
                options={EMI_TYPES}
                error={errors.emiType}
              />
              <Field id="entry-lender" label="Lender (optional)" error={errors.lender}>
                <input
                  id="entry-lender"
                  value={lender}
                  onChange={(e) => setLender(e.target.value)}
                  maxLength={120}
                  className={field}
                />
              </Field>
              <ChoiceGroup
                id="entry-status"
                label="Status"
                value={status}
                onChange={(v) => {
                  setStatus(v);
                  if (v === "paid" && !paidOn) setPaidOn(context.today);
                }}
                options={Object.keys(EMI_STATUS_LABELS)}
                optionLabel={(v) => EMI_STATUS_LABELS[v as keyof typeof EMI_STATUS_LABELS]}
                segmented
              />
              {status === "paid" ? (
                <Field id="entry-paid-on" label="Paid on" error={errors.paidOn}>
                  <input
                    id="entry-paid-on"
                    type="date"
                    value={paidOn}
                    onChange={(e) => setPaidOn(e.target.value)}
                    className={field}
                  />
                </Field>
              ) : null}
              {editing ? null : (
                <Field
                  id="entry-repeat"
                  label="Also add for the next months"
                  hint={`0 adds just this one. Up to ${MAX_EXTRA_MONTHS}, each added as Scheduled.`}
                  error={errors.repeatMonths}
                >
                  <Stepper
                    id="entry-repeat"
                    value={repeat}
                    onChange={setRepeat}
                    max={MAX_EXTRA_MONTHS}
                  />
                </Field>
              )}
            </>
          ) : null}

          {kind === "investment" ? (
            <Field id="entry-platform" label="Platform (optional)" error={errors.platform}>
              <input
                id="entry-platform"
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                maxLength={120}
                placeholder="Broker or app"
                className={field}
              />
            </Field>
          ) : null}

          <Field id="entry-date" label={DATE_LABELS[kind]} error={errors.entryDate}>
            <div className="flex flex-wrap items-center gap-2">
              <input
                id="entry-date"
                type="date"
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
                className={cn(field, "w-auto min-w-0 flex-1 basis-40")}
                aria-invalid={errors.entryDate ? true : undefined}
                aria-describedby={errors.entryDate ? "entry-date-error" : undefined}
              />
              {showQuickDates ? (
                <div className="flex gap-2">
                  <QuickDate
                    active={entryDate === context.today}
                    onClick={() => setEntryDate(context.today)}
                  >
                    Today
                  </QuickDate>
                  <QuickDate
                    active={entryDate === yesterday}
                    onClick={() => setEntryDate(yesterday)}
                  >
                    Yesterday
                  </QuickDate>
                </div>
              ) : null}
            </div>
          </Field>

          {!showNotes ? (
            <button
              type="button"
              onClick={() => setShowNotes(true)}
              className="inline-flex min-h-11 w-fit items-center gap-1.5 text-[13px] font-medium text-dash-ink-soft outline-none hover:text-dash-ink focus-visible:ring-3 focus-visible:ring-ring/50 md:min-h-8"
            >
              <Plus aria-hidden className="size-4" />
              Add a note
            </button>
          ) : (
            <Field id="entry-notes" label="Notes (optional)" error={errors.notes}>
              <textarea
                id="entry-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                maxLength={1000}
                rows={2}
                className={cn(field, "h-auto min-h-20 resize-y py-2.5 leading-relaxed")}
              />
            </Field>
          )}

          {formError ? (
            <p
              role="alert"
              className="rounded-xl bg-dash-bad-bg px-3.5 py-2.5 text-sm text-dash-bad"
            >
              {formError}
            </p>
          ) : null}
        </div>
      </SheetBody>

      <SheetFooter>
        {entry && onDelete ? (
          <DashButton
            variant="danger"
            size="icon"
            aria-label={`Delete ${entry.title}`}
            title="Delete"
            onClick={() => onDelete(entry)}
          >
            <Trash2 />
          </DashButton>
        ) : null}
        {canMarkPaid ? (
          <DashButton variant="secondary" onClick={() => onMarkPaid?.(entry)}>
            <CheckCircle2 />
            Mark paid
          </DashButton>
        ) : null}
        <div className="hidden flex-1 md:block" />
        {editing ? (
          <DashButton variant="secondary" className="hidden md:inline-flex" onClick={close}>
            Cancel
          </DashButton>
        ) : null}
        <DashButton
          type="submit"
          disabled={pending}
          onClick={() => (another.current = false)}
          className="h-12! font-semibold max-md:flex-1 md:h-10!"
        >
          {pending ? "Saving…" : editing ? "Save" : `Save ${label}`}
        </DashButton>
        {editing ? null : (
          <DashButton
            type="submit"
            variant="secondary"
            disabled={pending}
            onClick={() => (another.current = true)}
            className="h-12! max-md:flex-1 md:h-10!"
          >
            Save and add another
          </DashButton>
        )}
      </SheetFooter>
    </form>
  );
}

function QuickDate({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "h-11 rounded-full px-3.5 text-[13px] font-medium outline-none transition-[transform,background-color,color] duration-150 ease-snap focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-[0.97] md:h-9",
        active ? "bg-dash-ink text-dash-card" : "bg-dash-well text-dash-ink hover:bg-dash-edge",
      )}
    >
      {children}
    </button>
  );
}

function Field({
  id,
  label,
  hint,
  error,
  hideLabel = false,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  /** The field shows its name as a placeholder instead (screen 1c). */
  hideLabel?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className={hideLabel ? "sr-only" : "text-[13px] font-medium"}>
        {label}
      </label>
      {children}
      {hint ? <p className="text-xs text-dash-ink-soft">{hint}</p> : null}
      <FieldError id={`${id}-error`} error={error} />
    </div>
  );
}

function FieldError({ id, error }: { id: string; error?: string }) {
  if (!error) return null;
  return (
    <p id={id} role="alert" className="mt-1 text-[13px] font-medium text-dash-bad">
      {error}
    </p>
  );
}

/**
 * One choice from a short list, as tappable chips. Real radio buttons underneath, so arrow keys,
 * screen readers and forms behave as they should. `segmented` lays them out as one even bar.
 */
function ChoiceGroup({
  id,
  label,
  value,
  onChange,
  options,
  optionLabel = (o) => o,
  iconKind,
  error,
  segmented = false,
  clearable = false,
  hint,
  limit,
}: {
  /** Show only this many chips (plus the chosen one) until "N more" is tapped. */
  limit?: number;
  id: string;
  label: string;
  /** Optional: tapping the chosen chip again (or Delete on it) clears the choice. */
  clearable?: boolean;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
  optionLabel?: (option: string) => string;
  /** Show each option's category icon (category chips only). */
  iconKind?: EntryKind;
  error?: string;
  segmented?: boolean;
}) {
  const name = useId();
  const [expanded, setExpanded] = useState(false);
  const shown = limit && !expanded ? options.filter((o, i) => i < limit || o === value) : options;
  const hidden = options.length - shown.length;
  return (
    <div className="flex flex-col gap-1.5">
      <div
        role="radiogroup"
        aria-labelledby={`${id}-label`}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
      >
        <p id={`${id}-label`} className="mb-2 text-[13px] font-medium">
          {label}
          {hint && value ? (
            <span className="ml-1.5 font-normal text-dash-ink-soft">{hint}</span>
          ) : null}
        </p>
        <div
          className={cn(
            segmented
              ? "grid auto-cols-fr grid-flow-col gap-1 rounded-full bg-dash-well p-1"
              : "flex flex-wrap gap-2",
          )}
        >
          {shown.map((option) => {
            const checked = value === option;
            return (
              <label
                key={option}
                className={cn(
                  "relative inline-flex h-11 cursor-pointer items-center justify-center gap-1.5 rounded-full px-3.5 text-[13px] font-medium whitespace-nowrap transition-[transform,background-color,color,box-shadow] duration-150 ease-snap select-none has-focus-visible:ring-3 has-focus-visible:ring-ring/50 active:scale-[0.97] md:h-9",
                  segmented
                    ? checked
                      ? "bg-dash-raised text-dash-ink shadow-(--dash-lift)"
                      : "text-dash-ink-soft hover:text-dash-ink"
                    : checked
                      ? "bg-dash-ink text-dash-card"
                      : "bg-dash-well text-dash-ink hover:bg-dash-edge",
                  error && !segmented && !checked && "ring-1 ring-dash-bad/50",
                )}
              >
                <input
                  type="radio"
                  name={name}
                  value={option}
                  checked={checked}
                  onChange={() => onChange(option)}
                  onClick={clearable && checked ? () => onChange("") : undefined}
                  onKeyDown={
                    clearable && checked
                      ? (e) => {
                          if (e.key === "Delete" || e.key === "Backspace") onChange("");
                        }
                      : undefined
                  }
                  // Invisible but covering the whole chip, so a tap anywhere lands on the radio.
                  className="absolute inset-0 m-0 cursor-pointer appearance-none rounded-full opacity-0"
                />
                {checked && !segmented ? (
                  <Check aria-hidden className="size-3.5" strokeWidth={2.5} />
                ) : checked && segmented ? (
                  <Check aria-hidden className="size-3.5" />
                ) : iconKind ? (
                  <CategoryIcon kind={iconKind} category={option} className="size-3.5" />
                ) : null}
                {optionLabel(option)}
              </label>
            );
          })}
          {hidden > 0 ? (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="inline-flex h-11 items-center gap-1 rounded-full bg-dash-well px-3.5 text-[13px] font-medium text-dash-ink outline-none hover:bg-dash-edge focus-visible:ring-3 focus-visible:ring-ring/50 md:h-9"
            >
              {hidden} more
              <ChevronDown aria-hidden className="size-3.5" />
            </button>
          ) : null}
        </div>
      </div>
      <FieldError id={`${id}-error`} error={error} />
    </div>
  );
}

/** A small number with minus and plus buttons on either side (thumb friendly). */
function Stepper({
  id,
  value,
  onChange,
  max,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  max: number;
}) {
  const n = Math.max(0, Math.min(max, Number(value) || 0));
  return (
    <div className="inline-flex items-center gap-1 self-start rounded-full bg-dash-well p-1">
      <DashButton
        variant="ghost"
        size="icon"
        aria-label="One month fewer"
        disabled={n <= 0}
        onClick={() => onChange(String(n - 1))}
        className="bg-dash-card"
      >
        <Minus />
      </DashButton>
      <input
        id={id}
        type="number"
        min={0}
        max={max}
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="figures h-11 w-14 bg-transparent text-center text-base text-dash-ink outline-none [appearance:textfield] focus-visible:rounded-lg focus-visible:ring-3 focus-visible:ring-ring/40 md:h-9 [&::-webkit-inner-spin-button]:appearance-none"
      />
      <DashButton
        variant="ghost"
        size="icon"
        aria-label="One month more"
        disabled={n >= max}
        onClick={() => onChange(String(n + 1))}
        className="bg-dash-card"
      >
        <Plus />
      </DashButton>
    </div>
  );
}
