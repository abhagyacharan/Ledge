import { loadMoneyContext } from "../context";
import { CATEGORIES_BY_KIND, KIND_LABELS } from "../categories";
import { parsePeriod, periodLabel, periodRange, periodToParams } from "../periods";
import { parseEntryFilters } from "../schema";
import { emiProgress } from "../summary";
import {
  categoryTotals,
  emiStatusTotals,
  listEntries,
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
  const filters = parseEntryFilters(params, CATEGORIES_BY_KIND[kind]);
  const everything = { sort: "newest" as const, category: null, q: "" };
  const filtered = Boolean(filters.category || filters.q);

  const [entries, all, breakdown] = await Promise.all([
    listEntries(userId, kind, range, filters),
    filtered ? listEntries(userId, kind, range, everything) : null,
    loadBreakdown(userId, kind, range),
  ]);
  const inPeriod = all ?? entries;

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
