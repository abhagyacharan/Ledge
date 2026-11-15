"use client";

import {
  CircleHelp,
  Folder,
  IndianRupee,
  Landmark,
  ListTodo,
  Plus,
  Sparkles,
  TrendingUp,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";
import { useId, useState, type ReactNode } from "react";
import { formatMoney, minorToInput, parseMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import { CATEGORIES_BY_KIND, PAYMENT_METHODS } from "@/modules/expenses/categories";
import type { EmiChoice, PlanItem } from "../schema";

/**
 * The review sheet's cards (docs/voice-spec.md §4): one per action, every field editable, the
 * AI's own guesses marked, and a remove button. Changes go up through `onChange`.
 */

export type ReviewContext = {
  currency: string;
  locale: string;
  lists: { id: string; name: string }[];
  emis: EmiChoice[];
  /** New lists in this plan, for a task's list picker. */
  newLists: { key: string; name: string }[];
};

const field =
  "h-11 w-full min-w-0 rounded-xl border border-dash-edge bg-dash-card px-3 text-base text-dash-ink outline-none transition-[border-color,box-shadow] duration-150 focus-visible:border-dash-ink/40 focus-visible:ring-3 focus-visible:ring-ring/40 aria-invalid:border-dash-bad md:h-10 md:text-sm";

const KIND_ICON: Record<string, LucideIcon> = {
  expense: Wallet,
  income: IndianRupee,
  investment: TrendingUp,
};
const KIND_NAME: Record<string, string> = {
  expense: "Expense",
  income: "Income",
  investment: "Investment",
};

function Guessed() {
  return (
    <span className="ml-1.5 inline-flex items-center gap-0.5 rounded-full bg-dash-well px-1.5 py-px text-[10px] font-medium text-dash-ink-soft">
      <Sparkles aria-hidden className="size-2.5" />
      guessed
    </span>
  );
}

function Labeled({
  label,
  guessed,
  className,
  children,
}: {
  label: string;
  guessed?: boolean;
  className?: string;
  children: (id: string) => ReactNode;
}) {
  const id = useId();
  return (
    <div className={cn("flex min-w-0 flex-col gap-1", className)}>
      <label htmlFor={id} className="text-[12px] font-medium text-dash-ink-soft">
        {label}
        {guessed ? <Guessed /> : null}
      </label>
      {children(id)}
    </div>
  );
}

function CardShell({
  icon: Icon,
  title,
  onRemove,
  children,
  hints,
}: {
  icon: LucideIcon;
  title: string;
  onRemove: () => void;
  children: ReactNode;
  hints?: string[];
}) {
  return (
    <li className="rounded-2xl border border-dash-edge bg-dash-card p-3.5">
      <div className="mb-3 flex items-center gap-2">
        <span
          aria-hidden
          className="grid size-7 shrink-0 place-items-center rounded-full bg-dash-well text-dash-ink"
        >
          <Icon className="size-3.5" />
        </span>
        <h3 className="min-w-0 flex-1 truncate text-[13px] font-semibold">{title}</h3>
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${title.toLowerCase()}`}
          className="grid size-9 shrink-0 place-items-center rounded-full text-dash-ink-soft outline-none hover:bg-dash-well hover:text-dash-ink focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <X aria-hidden className="size-4" />
        </button>
      </div>
      {hints && hints.length > 0 ? (
        <ul className="mb-3 flex flex-col gap-1">
          {hints.map((hint) => (
            <li
              key={hint}
              className="rounded-lg bg-dash-warn-bg px-2.5 py-1.5 text-[12px] font-medium text-dash-warn"
            >
              {hint}
            </li>
          ))}
        </ul>
      ) : null}
      <div className="flex flex-col gap-2.5">{children}</div>
    </li>
  );
}

function AmountField({
  minor,
  currency,
  onChange,
}: {
  minor: number;
  currency: string;
  onChange: (minor: number) => void;
}) {
  const [text, setText] = useState(minor > 0 ? minorToInput(minor, currency) : "");
  const parsed = parseMoney(text, currency);
  return (
    <Labeled label="Amount">
      {(id) => (
        <input
          id={id}
          inputMode="decimal"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            const next = parseMoney(e.target.value, currency);
            onChange(next.ok ? next.minor : 0);
          }}
          aria-invalid={!parsed.ok || (parsed.ok && parsed.minor === 0) ? true : undefined}
          className={cn(field, "font-display text-xl font-semibold tabular-nums md:text-lg")}
        />
      )}
    </Labeled>
  );
}

export function ReviewCard({
  item,
  context,
  onChange,
  onRemove,
  onMakeTask,
}: {
  item: PlanItem;
  context: ReviewContext;
  onChange: (item: PlanItem) => void;
  onRemove: () => void;
  onMakeTask: (text: string) => void;
}) {
  switch (item.type) {
    case "list":
      return (
        <CardShell icon={Folder} title="New list" onRemove={onRemove}>
          <Labeled label="Name">
            {(id) => (
              <input
                id={id}
                value={item.name}
                maxLength={100}
                onChange={(e) => onChange({ ...item, name: e.target.value })}
                aria-invalid={item.name.trim() ? undefined : true}
                className={field}
              />
            )}
          </Labeled>
        </CardShell>
      );

    case "task": {
      const listValue = item.listKey ? `new:${item.listKey}` : (item.listId ?? "");
      return (
        <CardShell icon={ListTodo} title="New task" onRemove={onRemove}>
          <Labeled label="Task">
            {(id) => (
              <input
                id={id}
                value={item.title}
                maxLength={500}
                onChange={(e) => onChange({ ...item, title: e.target.value })}
                aria-invalid={item.title.trim() ? undefined : true}
                className={field}
              />
            )}
          </Labeled>
          <div className="grid grid-cols-2 gap-2">
            <Labeled label="List">
              {(id) => (
                <select
                  id={id}
                  value={listValue}
                  onChange={(e) => {
                    const v = e.target.value;
                    onChange(
                      v.startsWith("new:")
                        ? { ...item, listId: null, listKey: v.slice(4) }
                        : { ...item, listId: v, listKey: null },
                    );
                  }}
                  className={field}
                >
                  {context.newLists.map((l) => (
                    <option key={l.key} value={`new:${l.key}`}>
                      {l.name || "New list"} (new)
                    </option>
                  ))}
                  {context.lists.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              )}
            </Labeled>
            <Labeled label="Priority">
              {(id) => (
                <select
                  id={id}
                  value={item.priority}
                  onChange={(e) => onChange({ ...item, priority: Number(e.target.value) })}
                  className={field}
                >
                  <option value={0}>None</option>
                  <option value={1}>Low</option>
                  <option value={2}>Medium</option>
                  <option value={3}>High</option>
                </select>
              )}
            </Labeled>
            <Labeled label="Due">
              {(id) => (
                <input
                  id={id}
                  type="date"
                  value={item.dueDate ?? ""}
                  onChange={(e) =>
                    onChange({
                      ...item,
                      dueDate: e.target.value || null,
                      dueTime: e.target.value ? item.dueTime : null,
                    })
                  }
                  className={field}
                />
              )}
            </Labeled>
            <Labeled label="Time">
              {(id) => (
                <input
                  id={id}
                  type="time"
                  value={item.dueTime ?? ""}
                  disabled={!item.dueDate}
                  onChange={(e) => onChange({ ...item, dueTime: e.target.value || null })}
                  className={cn(field, "disabled:opacity-50")}
                />
              )}
            </Labeled>
          </div>
        </CardShell>
      );
    }

    case "entry": {
      const categories = CATEGORIES_BY_KIND[item.kind];
      return (
        <CardShell
          icon={KIND_ICON[item.kind] ?? Wallet}
          title={KIND_NAME[item.kind] ?? "Entry"}
          onRemove={onRemove}
          hints={item.hints}
        >
          <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-2">
            <AmountField
              minor={item.amountMinor}
              currency={context.currency}
              onChange={(amountMinor) => onChange({ ...item, amountMinor })}
            />
            <Labeled label="For">
              {(id) => (
                <input
                  id={id}
                  value={item.title}
                  maxLength={200}
                  onChange={(e) => onChange({ ...item, title: e.target.value })}
                  aria-invalid={item.title.trim() ? undefined : true}
                  className={field}
                />
              )}
            </Labeled>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Labeled label="Category" guessed={item.guessed.category}>
              {(id) => (
                <select
                  id={id}
                  value={item.category}
                  onChange={(e) =>
                    onChange({
                      ...item,
                      category: e.target.value,
                      guessed: { ...item.guessed, category: false },
                    })
                  }
                  className={field}
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              )}
            </Labeled>
            <Labeled label="Date">
              {(id) => (
                <input
                  id={id}
                  type="date"
                  value={item.entryDate}
                  onChange={(e) =>
                    e.target.value && onChange({ ...item, entryDate: e.target.value })
                  }
                  className={field}
                />
              )}
            </Labeled>
            {item.kind === "expense" ? (
              <>
                <Labeled label="Paid with">
                  {(id) => (
                    <select
                      id={id}
                      value={item.paymentMethod ?? "UPI"}
                      onChange={(e) => onChange({ ...item, paymentMethod: e.target.value })}
                      className={field}
                    >
                      {PAYMENT_METHODS.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  )}
                </Labeled>
                <Labeled label="Need or want" guessed={item.guessed.spendLabel}>
                  {(id) => (
                    <select
                      id={id}
                      value={item.spendLabel ?? ""}
                      onChange={(e) =>
                        onChange({
                          ...item,
                          spendLabel:
                            e.target.value === "" ? null : (e.target.value as "need" | "want"),
                          guessed: { ...item.guessed, spendLabel: false },
                        })
                      }
                      className={field}
                    >
                      <option value="">Not set</option>
                      <option value="need">Need</option>
                      <option value="want">Want</option>
                    </select>
                  )}
                </Labeled>
              </>
            ) : null}
          </div>
        </CardShell>
      );
    }

    case "emi_paid": {
      const chosen = context.emis.find((e) => e.id === item.emiId);
      return (
        <CardShell icon={Landmark} title="EMI paid" onRemove={onRemove} hints={item.hints}>
          <Labeled label="Which EMI">
            {(id) => (
              <select
                id={id}
                value={item.emiId ?? ""}
                onChange={(e) => onChange({ ...item, emiId: e.target.value || null, hints: [] })}
                aria-invalid={item.emiId ? undefined : true}
                className={field}
              >
                <option value="">Pick an EMI</option>
                {context.emis.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.title} · {formatMoney(e.amountMinor, context.currency, context.locale)}
                  </option>
                ))}
              </select>
            )}
          </Labeled>
          <Labeled label="Paid on">
            {(id) => (
              <input
                id={id}
                type="date"
                value={item.paidOn}
                onChange={(e) => e.target.value && onChange({ ...item, paidOn: e.target.value })}
                className={field}
              />
            )}
          </Labeled>
          {chosen ? (
            <p className="text-[12px] text-dash-ink-soft">
              Due {chosen.entryDate}, {chosen.category}
            </p>
          ) : null}
        </CardShell>
      );
    }

    case "unclear":
      return (
        <CardShell icon={CircleHelp} title="Not understood" onRemove={onRemove}>
          <p className="text-[14px] text-dash-ink">&ldquo;{item.text}&rdquo;</p>
          <p className="text-[12px] text-dash-ink-soft">{item.reason}</p>
          <button
            type="button"
            onClick={() => onMakeTask(item.text)}
            className="inline-flex h-10 w-fit items-center gap-1.5 rounded-full bg-dash-well px-3.5 text-[13px] font-medium text-dash-ink outline-none hover:bg-dash-edge focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <Plus aria-hidden className="size-3.5" />
            Add as a task
          </button>
        </CardShell>
      );
  }
}
