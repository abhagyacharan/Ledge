import type { SpendLabel } from "@/server/db/schema";
import { minorDigits } from "@/lib/money";

/**
 * The facts strip at the top of a journal day (docs/journal-spec.md), as pure code so every
 * sentence is unit tested. The data layer (`server/data/journal.ts`) supplies the raw figures;
 * this turns them into the cards and the one-line summary. Plain facts only, no AI.
 */

export type DayFactsInput = {
  /** Tasks finished that day, per list, most first. */
  doneByList: { list: string; count: number }[];
  /** Tasks due that day, and how many of them are still open. */
  dueTotal: number;
  dueOpen: number;
  /** That day's expenses, per category and need or want label. */
  expenses: { category: string; label: SpendLabel | null; amountMinor: number }[];
  /** Average daily spending over the days before (0 when there was none). */
  usualDailySpendMinor: number;
  incomeMinor: number;
  /** EMIs due that day (the Summary counts EMIs by due date too). */
  emiMinor: number;
  investedMinor: number;
};

export type FactKind = "tasks" | "spent" | "slipped" | "money";

export type Fact = {
  kind: FactKind;
  /** The big line: "4 done", "No-spend day". */
  title: string;
  /** The small line under it. */
  detail: string;
  /** Short form for the folded summary line. */
  short: string;
  /** True for the quiet "nothing happened" version of a card. */
  empty: boolean;
};

type Fmt = { currency: string; locale: string };

/** Money without the ".00" when it is a whole amount: "₹1,240", "₹99.50". */
export function shortMoney(minor: number, fmt: Fmt): string {
  const digits = minorDigits(fmt.currency);
  const per = 10 ** digits;
  const whole = minor % per === 0;
  return new Intl.NumberFormat(fmt.locale, {
    style: "currency",
    currency: fmt.currency,
    minimumFractionDigits: whole ? 0 : digits,
    maximumFractionDigits: whole ? 0 : digits,
  }).format(minor / per);
}

/** How a day's spending compares with the usual day: within a quarter either way is "about". */
export function compareToUsual(
  spentMinor: number,
  usualMinor: number,
): "below" | "about" | "above" | null {
  if (usualMinor <= 0) return null;
  const ratio = spentMinor / usualMinor;
  if (ratio < 0.75) return "below";
  if (ratio > 1.25) return "above";
  return "about";
}

function tasksFact(input: DayFactsInput, isToday: boolean): Fact {
  const done = input.doneByList.reduce((sum, l) => sum + l.count, 0);
  if (done === 0) {
    return isToday
      ? {
          kind: "tasks",
          title: "Nothing ticked off yet",
          detail: "There's still time for one.",
          short: "0 done",
          empty: true,
        }
      : {
          kind: "tasks",
          title: "A rest day",
          detail: "No tasks finished.",
          short: "0 done",
          empty: true,
        };
  }
  const lists = input.doneByList.slice(0, 3).map((l) => `${l.list} ${l.count}`);
  const more = input.doneByList.length - 3;
  return {
    kind: "tasks",
    title: `${done} done`,
    detail: more > 0 ? `${lists.join(" · ")} · ${more} more` : lists.join(" · "),
    short: `${done} done`,
    empty: false,
  };
}

function spentFact(input: DayFactsInput, isToday: boolean, fmt: Fmt): Fact {
  const spent = input.expenses.reduce((sum, e) => sum + e.amountMinor, 0);
  if (spent === 0) {
    return isToday
      ? {
          kind: "spent",
          title: "Nothing spent yet",
          detail: "A no-spend day so far.",
          short: "Nothing spent",
          empty: true,
        }
      : {
          kind: "spent",
          title: "No-spend day",
          detail: "Nothing went out. Nicely done.",
          short: "No-spend day",
          empty: true,
        };
  }
  const parts: string[] = [];
  const wants = input.expenses
    .filter((e) => e.label === "want")
    .reduce((sum, e) => sum + e.amountMinor, 0);
  if (wants > 0) parts.push(`${shortMoney(wants, fmt)} on wants`);

  const byCategory = new Map<string, number>();
  for (const e of input.expenses) {
    byCategory.set(e.category, (byCategory.get(e.category) ?? 0) + e.amountMinor);
  }
  const top = [...byCategory.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  // "Mostly" only when one category is at least half of the day.
  if (top.length === 1) parts.push(top[0][0]);
  else if (top[0][1] * 2 >= spent) parts.push(`mostly ${top[0][0]}`);

  const comparison = compareToUsual(spent, input.usualDailySpendMinor);
  if (comparison === "below") parts.push("below your usual");
  if (comparison === "about") parts.push("about your usual");
  if (comparison === "above") parts.push("above your usual");

  return {
    kind: "spent",
    title: `${shortMoney(spent, fmt)} spent`,
    detail: parts.join(" · "),
    short: `${shortMoney(spent, fmt)} spent`,
    empty: false,
  };
}

function slippedFact(input: DayFactsInput, isToday: boolean): Fact {
  const open = input.dueOpen;
  if (open > 0) {
    return isToday
      ? {
          kind: "slipped",
          title: `${open} still open`,
          detail: "Due today, not done yet.",
          short: `${open} open`,
          empty: false,
        }
      : {
          kind: "slipped",
          title: `${open} slipped`,
          detail: "Due this day, still open.",
          short: `${open} slipped`,
          empty: false,
        };
  }
  if (input.dueTotal === 0) {
    return {
      kind: "slipped",
      title: "Nothing due",
      detail: isToday ? "A clear day." : "Nothing was due this day.",
      short: "Nothing due",
      empty: true,
    };
  }
  return {
    kind: "slipped",
    title: isToday ? "All caught up" : "Nothing slipped",
    detail: isToday ? "Everything due today is done." : "Everything due was done.",
    short: isToday ? "All caught up" : "Nothing slipped",
    empty: true,
  };
}

/** Income, EMIs and investments: only a card on days that had any. */
function moneyFact(input: DayFactsInput, fmt: Fmt): Fact | null {
  const items = [
    input.investedMinor > 0
      ? { text: `${shortMoney(input.investedMinor, fmt)} invested`, note: "Put away for later." }
      : null,
    input.incomeMinor > 0
      ? { text: `${shortMoney(input.incomeMinor, fmt)} came in`, note: "Income received." }
      : null,
    input.emiMinor > 0
      ? { text: `${shortMoney(input.emiMinor, fmt)} EMI due`, note: "A loan payment fell due." }
      : null,
  ].filter((p): p is { text: string; note: string } => p !== null);
  if (items.length === 0) return null;
  return {
    kind: "money",
    title: items[0].text,
    detail:
      items.length > 1
        ? items
            .slice(1)
            .map((i) => i.text)
            .join(" · ")
        : items[0].note,
    short: items[0].text,
    empty: false,
  };
}

/** The cards for one day, in display order. */
export function buildDayFacts(input: DayFactsInput, isToday: boolean, fmt: Fmt): Fact[] {
  const money = moneyFact(input, fmt);
  return [
    tasksFact(input, isToday),
    spentFact(input, isToday, fmt),
    slippedFact(input, isToday),
    ...(money ? [money] : []),
  ];
}

/** The folded line: "4 done · ₹1,240 spent · 2 slipped · ₹5,000 invested". */
export function summaryLine(facts: Fact[]): string {
  return facts.map((f) => f.short).join(" · ");
}
