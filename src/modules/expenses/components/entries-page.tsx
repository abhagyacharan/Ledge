import { loadMoneyContext } from "../context";
import { CATEGORIES_BY_KIND, KIND_LABELS } from "../categories";
import { parsePeriod, periodLabel, periodRange } from "../periods";
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
import { EntriesView } from "./entries-view";

/**
 * Server half of an entries tab: reads the period and filters from the URL, loads the entries and
 * the small totals shown under the heading, and hands everything to the interactive view.
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

  const [entries, all] = await Promise.all([
    listEntries(userId, kind, range, filters),
    filters.category || filters.q ? listEntries(userId, kind, range, everything) : null,
  ]);
  const periodTotalMinor = (all ?? entries).reduce((sum, e) => sum + e.amountMinor, 0);

  let summary: { label: string; amountMinor: number }[] = [];
  if (kind === "expense") {
    summary = (await paymentMethodTotals(userId, range)).map((r) => ({
      label: r.method,
      amountMinor: r.amountMinor,
    }));
  } else if (kind === "emi") {
    const progress = emiProgress(await emiStatusTotals(userId, range));
    summary =
      periodTotalMinor > 0
        ? [
            { label: "Paid", amountMinor: progress.paidMinor },
            { label: "To pay", amountMinor: progress.remainingMinor },
            ...(progress.delayedCount > 0
              ? [
                  {
                    label: `Delayed (${progress.delayedCount})`,
                    amountMinor: progress.delayedMinor,
                  },
                ]
              : []),
          ]
        : [];
  } else {
    summary = (await categoryTotals(userId, kind, range))
      .sort((a, b) => b.amountMinor - a.amountMinor)
      .map((r) => ({ label: r.category, amountMinor: r.amountMinor }));
  }

  return (
    <EntriesView
      kind={kind}
      entries={entries}
      periodLabel={periodLabel(period)}
      currency={money.currency}
      locale={money.locale}
      today={money.today}
      filters={filters}
      summary={summary}
      periodTotalMinor={periodTotalMinor}
    />
  );
}

export function entriesMetadata(kind: EntryKind) {
  return { title: KIND_LABELS[kind].tab };
}
