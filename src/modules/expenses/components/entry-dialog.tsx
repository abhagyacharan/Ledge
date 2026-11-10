"use client";

import { useState, useTransition, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { minorToInput } from "@/lib/money";
import type { EntryKind, FinanceEntry } from "@/server/db/schema";
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
} from "../categories";
import { MAX_EXTRA_MONTHS } from "../emi-series";

export type EntryFormContext = { currency: string; today: string };

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kind: EntryKind;
  /** Pass an entry to edit it; omit to add a new one. */
  entry?: FinanceEntry;
  context: EntryFormContext;
};

/** Add or edit one entry. The form changes shape with the kind (see docs/expenses-spec.md). */
export function EntryDialog({ open, onOpenChange, kind, entry, context }: Props) {
  // Remount the form each time the dialog opens so it always starts from the entry being edited.
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90svh] overflow-y-auto">
        {open ? (
          <EntryForm
            key={entry?.id ?? "new"}
            kind={kind}
            entry={entry}
            context={context}
            close={() => onOpenChange(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function EntryForm({
  kind,
  entry,
  context,
  close,
}: {
  kind: EntryKind;
  entry?: FinanceEntry;
  context: EntryFormContext;
  close: () => void;
}) {
  const editing = Boolean(entry);
  const [entryDate, setEntryDate] = useState(entry?.entryDate ?? context.today);
  const [title, setTitle] = useState(entry?.title ?? "");
  const [category, setCategory] = useState(entry?.category ?? "");
  const [amount, setAmount] = useState(
    entry ? minorToInput(entry.amountMinor, context.currency) : "",
  );
  const [notes, setNotes] = useState(entry?.notes ?? "");
  const [paymentMethod, setPaymentMethod] = useState(entry?.paymentMethod ?? "");
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

  function payload() {
    const base = { entryDate, title, category, amount, notes };
    switch (kind) {
      case "income":
        return { kind, ...base };
      case "expense":
        return { kind, ...base, paymentMethod };
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
        toast.success(
          entry ? "Saved" : created > 1 ? `Added ${created} ${KIND_LABELS.emi.plural}` : "Added",
        );
        close();
      } catch {
        setFormError("Couldn't reach the server. Check your connection and try again.");
      }
    });
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle>
          {editing ? "Edit" : "Add"} {label}
        </DialogTitle>
        <DialogDescription>
          {kind === "emi"
            ? "Its due date decides which month it belongs to."
            : "Saved amounts are exact: no rounding."}
        </DialogDescription>
      </DialogHeader>

      {kind === "emi" ? (
        <SelectField
          id="entry-emi-type"
          label="Type"
          value={emiType}
          onChange={setEmiType}
          options={EMI_TYPES}
          error={errors.emiType}
        />
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="entry-date" label={DATE_LABELS[kind]} error={errors.entryDate}>
          <Input
            id="entry-date"
            type="date"
            value={entryDate}
            onChange={(e) => setEntryDate(e.target.value)}
            className="h-11 md:h-8"
            aria-invalid={errors.entryDate ? true : undefined}
          />
        </Field>
        <Field id="entry-amount" label="Amount" error={errors.amount}>
          <div className="relative">
            <span
              aria-hidden
              className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-sm text-muted-foreground"
            >
              {context.currency === "INR" ? "₹" : context.currency}
            </span>
            <Input
              id="entry-amount"
              inputMode="decimal"
              autoComplete="off"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="h-11 pl-8 tabular-nums md:h-8"
              aria-invalid={errors.amount ? true : undefined}
            />
          </div>
        </Field>
      </div>

      <Field id="entry-title" label={TITLE_LABELS[kind]} error={errors.title}>
        <Input
          id="entry-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={200}
          autoFocus={!editing}
          className="h-11 md:h-8"
          aria-invalid={errors.title ? true : undefined}
        />
      </Field>

      <SelectField
        id="entry-category"
        label={CATEGORY_LABELS[kind]}
        value={category}
        onChange={setCategory}
        options={CATEGORIES_BY_KIND[kind]}
        error={errors.category}
      />

      {kind === "expense" ? (
        <SelectField
          id="entry-payment"
          label="Payment method"
          value={paymentMethod}
          onChange={setPaymentMethod}
          options={PAYMENT_METHODS}
          error={errors.paymentMethod}
        />
      ) : null}

      {kind === "emi" ? (
        <>
          <Field id="entry-lender" label="Lender (optional)" error={errors.lender}>
            <Input
              id="entry-lender"
              value={lender}
              onChange={(e) => setLender(e.target.value)}
              maxLength={120}
              className="h-11 md:h-8"
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="entry-status">Status</Label>
              <Select
                value={status}
                onValueChange={(v) => {
                  setStatus(v);
                  if (v === "paid" && !paidOn) setPaidOn(context.today);
                }}
              >
                <SelectTrigger id="entry-status" className="h-11 w-full md:h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(EMI_STATUS_LABELS).map(([value, text]) => (
                    <SelectItem key={value} value={value}>
                      {text}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {status === "paid" ? (
              <Field id="entry-paid-on" label="Paid on" error={errors.paidOn}>
                <Input
                  id="entry-paid-on"
                  type="date"
                  value={paidOn}
                  onChange={(e) => setPaidOn(e.target.value)}
                  className="h-11 md:h-8"
                />
              </Field>
            ) : null}
          </div>
          {editing ? null : (
            <Field
              id="entry-repeat"
              label="Also add for the next months"
              hint={`0 adds just this one. Up to ${MAX_EXTRA_MONTHS}; each is added as Scheduled.`}
              error={errors.repeatMonths}
            >
              <Input
                id="entry-repeat"
                type="number"
                min={0}
                max={MAX_EXTRA_MONTHS}
                inputMode="numeric"
                value={repeat}
                onChange={(e) => setRepeat(e.target.value)}
                className="h-11 w-28 md:h-8"
              />
            </Field>
          )}
        </>
      ) : null}

      {kind === "investment" ? (
        <Field id="entry-platform" label="Platform (optional)" error={errors.platform}>
          <Input
            id="entry-platform"
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            maxLength={120}
            placeholder="Broker or app"
            className="h-11 md:h-8"
          />
        </Field>
      ) : null}

      <Field id="entry-notes" label="Notes (optional)" error={errors.notes}>
        <Textarea
          id="entry-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          maxLength={1000}
          rows={2}
        />
      </Field>

      {formError ? (
        <p role="alert" className="text-sm text-destructive">
          {formError}
        </p>
      ) : null}

      <DialogFooter>
        <Button type="button" variant="outline" className="h-11 md:h-8" onClick={close}>
          Cancel
        </Button>
        <Button type="submit" className="h-11 md:h-8" disabled={pending}>
          {pending ? "Saving…" : editing ? "Save" : `Add ${label}`}
        </Button>
      </DialogFooter>
    </form>
  );
}

function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function SelectField({
  id,
  label,
  value,
  onChange,
  options,
  error,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
  error?: string;
}) {
  return (
    <Field id={id} label={label} error={error}>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger
          id={id}
          className="h-11 w-full md:h-8"
          aria-invalid={error ? true : undefined}
        >
          <SelectValue placeholder="Choose…" />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}
