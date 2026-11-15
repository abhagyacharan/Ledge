import { loadMoneyContext } from "../context";
import { CATEGORIES_BY_KIND, KIND_LABELS } from "../categories";
import { dateInPeriod, parsePeriod, periodLabel, periodRange, periodToParams } from "../periods";
import { parseEntryFilters } from "../schema";
import { emiProgress, periodTotals, previousMonthTotals } from "../summary";
import {
  categoryTotals,
  emiStatusTotals,
  listEntries,
  monthlyTotals,
  paymentMethodTotals,
} from "@/server/data/finance";
import { requireUser } from "@/server/session";
import type { EntryKind } from "@/server/db/schema";
import type { Breakdown } from "./entries-overview";
import { EntriesView } from "./entries-view";

/**
 * Server half of an entries tab: reads the period and filters from the URL, loads the entries and
 * the overview figures, and hands everything to the interactive view.
 */
export async function EntriesPage({
  kind,
  searchParams,
}: {
  kind: EntryKind;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { userId } = await requireUser();
  const [money, params] = await Promise.all([loadMoneyContext(userId), searchParams]);
  const period = parsePeriod(params, money.defaultPeriod);
  const range = periodRange(period);
  const parsed = parseEntryFilters(params, CATEGORIES_BY_KIND[kind]);
  // A day only counts inside the chosen period, and labels only on expenses.
  const filters = {
    ...parsed,
    label: kind === "expense" ? parsed.label : null,
    day: parsed.day && dateInPeriod(parsed.day, period) ? parsed.day : null,
  };
  const everything = { sort: "newest" as const, category: null, q: "" };
  const filtered = Boolean(filters.category || filters.q || filters.label || filters.day);
  const listRange = filters.day ? { from: filters.day, to: filters.day } : range;

  const needsTotals = kind === "income" || kind === "investment";
  const [entries, all, breakdown, year, lastYear] = await Promise.all([
    listEntries(userId, kind, listRange, filters),
    filtered ? listEntries(userId, kind, range, everything) : null,
    loadBreakdown(userId, kind, range),
    needsTotals ? monthlyTotals(userId, period.year) : Promise.resolve([]),
    needsTotals && period.month === 1
      ? monthlyTotals(userId, period.year - 1)
      : Promise.resolve([]),
  ]);
  const inPeriod = all ?? entries;
  const totals = needsTotals ? periodTotals(year, period.month) : null;

  // Income: the change against the month before (screen 6e).
  const previous =
    kind === "income" && period.month !== "all"
      ? previousMonthTotals(year, lastYear, period.month)
      : null;
  const change =
    previous && totals && period.month !== "all"
      ? {
          diffMinor: totals.income - previous.income,
          month: period.month === 1 ? 12 : period.month - 1,
        }
      : null;
  // Investments: how much of the period's savings went in, and what is left (screen 6f).
  const savings =
    kind === "investment" && totals
      ? { netSavingsMinor: totals.netSavings, leftMinor: totals.leftAfterInvesting }
      : null;

  return (
    <EntriesView
      kind={kind}
      entries={entries}
      periodLabel={periodLabel(period)}
      periodKey={periodToParams(period).toString()}
      currency={money.currency}
      locale={money.locale}
      today={money.today}
      filters={filters}
      breakdown={breakdown}
      periodTotalMinor={inPeriod.reduce((sum, e) => sum + e.amountMinor, 0)}
      periodCount={inPeriod.length}
      categoriesUsed={[...new Set(inPeriod.map((e) => e.category))]}
      labelsUsed={inPeriod.some((e) => e.spendLabel !== null)}
      change={change}
      savings={savings}
    />
  );
}

/** The one breakdown each tab's overview shows. */
async function loadBreakdown(
  userId: string,
  kind: EntryKind,
  range: { from: string; to: string },
): Promise<Breakdown> {
  if (kind === "emi") {
    return { type: "emi", progress: emiProgress(await emiStatusTotals(userId, range)) };
  }
  if (kind === "expense") {
    const rows = await paymentMethodTotals(userId, range);
    return {
      type: "shares",
      title: "By payment method",
      rows: rows.map((r) => ({ label: r.method, amountMinor: r.amountMinor })),
    };
  }
  const rows = await categoryTotals(userId, kind, range);
  return {
    type: "shares",
    title: kind === "investment" ? "By type" : "By category",
    rows: rows.map((r) => ({ label: r.category, amountMinor: r.amountMinor })),
  };
}

export function entriesMetadata(kind: EntryKind) {
  return { title: KIND_LABELS[kind].tab };
}
