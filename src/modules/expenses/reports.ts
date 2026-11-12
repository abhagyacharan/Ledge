import "server-only";
import { z } from "zod";
import { formatDate } from "@/lib/dates";
import { categoryTotals, monthlyTotals } from "@/server/data/finance";
import { loadMoneyContext } from "./context";
import { MAX_YEAR, MIN_YEAR, periodLabel, periodRange, type Period } from "./periods";
import { breakdownPdf, cashFlowPdf, reportFileName } from "./report-pdf";
import { annualTrend, expenseBreakdown } from "./summary";

/**
 * The PDF downloads behind the Summary cards' download buttons and Settings (docs/expenses-spec.md).
 * Each takes the signed-in user's id and reads only that user's entries.
 */

const year = z.coerce.number().int().min(MIN_YEAR).max(MAX_YEAR);

/** `?y=2026&m=11` or `?y=2026&m=all`. */
export const breakdownQuery = z.object({
  y: year,
  m: z.union([z.literal("all"), z.coerce.number().int().min(1).max(12)]),
});

/** `?y=2026`. */
export const cashFlowQuery = z.object({ y: year });

export type PdfFile = { bytes: Uint8Array; fileName: string };

export async function breakdownReport(userId: string, period: Period): Promise<PdfFile> {
  const money = await loadMoneyContext(userId);
  const rows = await categoryTotals(userId, "expense", periodRange(period));
  const { rows: breakdown, total } = expenseBreakdown(rows);
  const bytes = breakdownPdf({
    periodLabel: periodLabel(period),
    rows: breakdown,
    total,
    fmt: { currency: money.currency, locale: money.locale },
    madeOn: formatDate(money.today, money.locale),
  });
  return { bytes, fileName: reportFileName("expense-breakdown", period.year, period.month) };
}

export async function cashFlowReport(userId: string, forYear: number): Promise<PdfFile> {
  const money = await loadMoneyContext(userId);
  const { months, total } = annualTrend(await monthlyTotals(userId, forYear));
  const bytes = cashFlowPdf({
    year: forYear,
    months,
    total,
    fmt: { currency: money.currency, locale: money.locale },
    madeOn: formatDate(money.today, money.locale),
  });
  return { bytes, fileName: reportFileName("cash-flow", forYear) };
}

/** A PDF as a download, never cached (it is personal and changes with every new entry). */
export function pdfResponse({ bytes, fileName }: PdfFile): Response {
  return new Response(bytes.slice().buffer as ArrayBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
