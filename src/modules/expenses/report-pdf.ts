import { formatAmount, formatPercent } from "@/lib/money";
import { A4, INK, PdfDocument, fitText, textWidth, type PdfPage, type Rgb } from "@/lib/pdf";
import { MONTH_NAMES } from "./periods";
import type { BreakdownRow, CategoryRow, PeriodTotals, TrendRow } from "./summary";

/**
 * The two printable reports (docs/expenses-spec.md, "Download as PDF"): the expense breakdown by
 * category for a month or a year, and the annual cash flow trend for a year. Pure: they take the
 * same numbers the Summary screen shows and return the bytes of a PDF. Periods with no entries
 * still print every row, with zeros, so the sheet is complete.
 */

type Fmt = { currency: string; locale: string };

const MARGIN = 48;
const RIGHT = A4.width - MARGIN;
const WIDTH = RIGHT - MARGIN;
const ROW = 22;
const BOTTOM = A4.height - 72;

const SOFT: Rgb = [0.42, 0.44, 0.45];
const HAIRLINE: Rgb = [0.87, 0.88, 0.87];
const BAND: Rgb = [0.95, 0.955, 0.95];
const ORANGE: Rgb = [0.949, 0.42, 0.129];

export type Column = {
  label: string;
  /** Left edge for "left" columns, right edge for "right" ones. */
  x: number;
  align: "left" | "right";
};

type Header = { title: string; subtitle: string; madeOn: string; footer: string };

/** The logo (the L and the orange rule), the title block and the date. */
function drawHeader(page: PdfPage, header: Header) {
  // The mark on its 32-unit grid (x 6 to 26, y 4 to 28), at 0.75 pt per unit.
  const s = 0.75;
  const at = (gx: number, gy: number) => [MARGIN + (gx - 6) * s, 40 + (gy - 4) * s] as const;
  const [lx, ly] = at(6, 4);
  page.rect(lx, ly, 4 * s, 16 * s, INK);
  const [fx, fy] = at(6, 16);
  page.rect(fx, fy, 20 * s, 4 * s, INK);
  const [rx, ry] = at(6, 24);
  page.rect(rx, ry, 20 * s, 4 * s, ORANGE);
  page.text(MARGIN + 22, 58, "Ledge", { size: 14, font: "bold" });
  page.text(RIGHT, 58, `Made on ${header.madeOn}`, { size: 8, color: SOFT, align: "right" });

  page.text(MARGIN, 104, header.title, { size: 20, font: "bold" });
  page.text(MARGIN, 122, header.subtitle, { size: 10, color: SOFT });
}

function drawFooter(page: PdfPage, footer: string, pageNo: number, pages: number) {
  const y = A4.height - 40;
  page.line(MARGIN, y - 12, RIGHT, y - 12, HAIRLINE);
  page.text(MARGIN, y, footer, { size: 8, color: SOFT });
  page.text(RIGHT, y, `Page ${pageNo} of ${pages}`, { size: 8, color: SOFT, align: "right" });
}

function drawColumnHeads(page: PdfPage, y: number, columns: Column[]) {
  page.rect(MARGIN, y, WIDTH, ROW, BAND);
  for (const c of columns) {
    page.text(c.x, y + 14.5, c.label, { size: 8, font: "bold", color: SOFT, align: c.align });
  }
}

type Cell = { text: string; bold?: boolean; soft?: boolean };

/**
 * Draws a table across as many pages as it needs, repeating the column heads. Returns the page
 * and the y below the last row, for anything that follows.
 */
function drawTable(
  doc: PdfDocument,
  header: Header,
  columns: Column[],
  rows: Cell[][],
  extra?: (page: PdfPage, y: number, index: number) => void,
): { page: PdfPage; y: number } {
  let page = doc.addPage();
  drawHeader(page, header);
  let y = 146;
  drawColumnHeads(page, y, columns);
  y += ROW;
  rows.forEach((cells, index) => {
    if (y + ROW > BOTTOM) {
      page = doc.addPage();
      drawHeader(page, header);
      y = 146;
      drawColumnHeads(page, y, columns);
      y += ROW;
    }
    cells.forEach((cell, i) => {
      const column = columns[i];
      if (!column) return;
      const max = i === 0 ? 170 : 110;
      page.text(column.x, y + 14.5, fitText(cell.text, max, 9.5, cell.bold ? "bold" : "regular"), {
        size: 9.5,
        font: cell.bold ? "bold" : "regular",
        color: cell.soft ? SOFT : INK,
        align: column.align,
      });
    });
    extra?.(page, y, index);
    page.line(MARGIN, y + ROW, RIGHT, y + ROW, HAIRLINE);
    y += ROW;
  });
  return { page, y };
}

/** The total row: a rule above, bold figures, and the accountant's double rule under `doubleAt`. */
function drawTotal(
  page: PdfPage,
  y: number,
  columns: Column[],
  cells: string[],
  doubleAt: number[],
) {
  page.line(MARGIN, y, RIGHT, y, INK, 0.8);
  cells.forEach((text, i) => {
    const column = columns[i];
    if (!column) return;
    page.text(column.x, y + 15, text, { size: 9.5, font: "bold", align: column.align });
  });
  for (const i of doubleAt) {
    const column = columns[i];
    const text = cells[i];
    if (!column || text === undefined) continue;
    const width = textWidth(text, 9.5, "bold");
    page.line(column.x - width, y + 19, column.x, y + 19, INK, 0.6);
    page.line(column.x - width, y + 21, column.x, y + 21, INK, 0.6);
  }
  return y + ROW + 4;
}

function finish(doc: PdfDocument, footer: string): Uint8Array {
  doc.pages.forEach((page, i) => drawFooter(page, footer, i + 1, doc.pages.length));
  return doc.toBytes();
}

/** "INR": the column figures carry no symbol, so the subtitle names the currency once. */
const currencyNote = (fmt: Fmt) => `amounts in ${fmt.currency}`;

export function breakdownPdf(input: {
  periodLabel: string;
  rows: BreakdownRow[];
  total: CategoryRow;
  fmt: Fmt;
  madeOn: string;
}): Uint8Array {
  const { periodLabel, rows, total, fmt, madeOn } = input;
  const title = "Expense breakdown by category";
  const header: Header = {
    title,
    subtitle: `${periodLabel} - ${currencyNote(fmt)}`,
    madeOn,
    footer: `Ledge - ${title} - ${periodLabel}`,
  };
  const columns: Column[] = [
    { label: "CATEGORY", x: MARGIN + 8, align: "left" },
    { label: "ITEMS", x: 300, align: "right" },
    { label: "SPENT", x: 400, align: "right" },
    { label: "% OF TOTAL", x: 468, align: "right" },
    { label: "SHARE", x: 478, align: "left" },
  ];
  const doc = new PdfDocument(`${title}, ${periodLabel}`);
  const cells = rows.map((row) => {
    const soft = row.amountMinor === 0;
    return [
      { text: row.category, soft },
      { text: String(row.count), soft },
      { text: formatAmount(row.amountMinor, fmt.currency, fmt.locale), soft },
      { text: formatPercent(row.percent, fmt.locale), soft },
    ];
  });
  const barWidth = RIGHT - 8 - 478;
  const { page, y } = drawTable(doc, header, columns, cells, (p, rowY, index) => {
    const percent = Math.max(0, Math.min(100, rows[index]?.percent ?? 0));
    p.rect(478, rowY + 8, barWidth, 6, BAND);
    if (percent > 0) p.rect(478, rowY + 8, (barWidth * percent) / 100, 6, ORANGE);
  });
  const after = drawTotal(
    page,
    y,
    columns,
    [
      "Total living expenses",
      String(total.count),
      formatAmount(total.amountMinor, fmt.currency, fmt.locale),
      total.amountMinor > 0 ? formatPercent(100, fmt.locale) : formatPercent(null),
    ],
    [2],
  );
  if (total.amountMinor === 0) {
    page.text(MARGIN, after + 18, "No expenses were recorded for this period.", {
      size: 9.5,
      color: SOFT,
    });
  }
  return finish(doc, header.footer);
}

export function cashFlowPdf(input: {
  year: number;
  months: TrendRow[];
  total: PeriodTotals;
  fmt: Fmt;
  madeOn: string;
}): Uint8Array {
  const { year, months, total, fmt, madeOn } = input;
  const title = "Annual cash flow trend";
  const header: Header = {
    title,
    subtitle: `January to December ${year} - ${currencyNote(fmt)}`,
    madeOn,
    footer: `Ledge - ${title} - ${year}`,
  };
  const columns: Column[] = [
    { label: "MONTH", x: MARGIN + 8, align: "left" },
    { label: "INFLOWS", x: 200, align: "right" },
    { label: "EMIS & LOANS", x: 285, align: "right" },
    { label: "EXPENSES", x: 370, align: "right" },
    { label: "INVESTED", x: 455, align: "right" },
    { label: "NET SAVINGS", x: RIGHT - 8, align: "right" },
  ];
  const money = (minor: number) => formatAmount(minor, fmt.currency, fmt.locale);
  const doc = new PdfDocument(`${title}, ${year}`);
  const cells = months.map((row) => {
    const soft = row.income + row.emi + row.expense + row.investment === 0;
    return [
      { text: MONTH_NAMES[row.month - 1] ?? String(row.month), soft },
      { text: money(row.income), soft },
      { text: money(row.emi), soft },
      { text: money(row.expense), soft },
      { text: money(row.investment), soft },
      { text: money(row.netSavings), soft, bold: !soft },
    ];
  });
  const { page, y } = drawTable(doc, header, columns, cells);
  const after = drawTotal(
    page,
    y,
    columns,
    [
      `Full year ${year}`,
      money(total.income),
      money(total.emi),
      money(total.expense),
      money(total.investment),
      money(total.netSavings),
    ],
    [5],
  );
  const rate =
    total.savingsRate === null
      ? "Savings rate: none (no inflows this year)."
      : `Savings rate: ${formatPercent(total.savingsRate, fmt.locale)} of inflows. Net savings are inflows minus EMIs and loans minus expenses.`;
  page.text(MARGIN, after + 18, rate, { size: 9, color: SOFT });
  return finish(doc, header.footer);
}

/** File names such as ledge-expense-breakdown-2026-11.pdf and ledge-cash-flow-2026.pdf. */
export function reportFileName(
  report: "expense-breakdown" | "cash-flow",
  year: number,
  month?: number | "all",
): string {
  const suffix =
    month === undefined || month === "all"
      ? `${year}`
      : `${year}-${String(month).padStart(2, "0")}`;
  return `ledge-${report}-${suffix}.pdf`;
}
