/**
 * Money is stored as integer minor units (paise for INR), never as floating point numbers
 * (CLAUDE.md §7). This file turns minor units into text for the screen and typed text back into
 * minor units, and does the one bit of arithmetic (percentages) the summary needs.
 */

export const DEFAULT_CURRENCY = "INR";
export const DEFAULT_LOCALE = "en-IN";

/** The largest amount accepted in one entry, in major units (one billion). */
export const MAX_MAJOR_AMOUNT = 1_000_000_000;

/** How many decimal places a currency has (2 for INR and USD, 0 for JPY). */
export function minorDigits(currency: string = DEFAULT_CURRENCY): number {
  return (
    new Intl.NumberFormat("en", { style: "currency", currency }).resolvedOptions()
      .maximumFractionDigits ?? 2
  );
}

/** The size of one major unit in minor units (100 for INR). */
function minorPerMajor(currency: string): number {
  return 10 ** minorDigits(currency);
}

/** "₹28,000.00" (Indian grouping for en-IN: "₹1,23,456.00"). */
export function formatMoney(
  minor: number,
  currency: string = DEFAULT_CURRENCY,
  locale: string = DEFAULT_LOCALE,
): string {
  const digits = minorDigits(currency);
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(minor / minorPerMajor(currency));
}

/** Like `formatMoney` but without the currency symbol, for table columns: "28,000.00". */
export function formatAmount(
  minor: number,
  currency: string = DEFAULT_CURRENCY,
  locale: string = DEFAULT_LOCALE,
): string {
  const digits = minorDigits(currency);
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(minor / minorPerMajor(currency));
}

export type ParsedMoney = { ok: true; minor: number } | { ok: false; error: string };

/**
 * Reads what a person types ("1234", "1,234.5", "₹ 1,23,456.78") into minor units, without ever
 * going through floating point. Refuses negatives, letters, more decimals than the currency has,
 * and anything above one billion.
 */
export function parseMoney(text: string, currency: string = DEFAULT_CURRENCY): ParsedMoney {
  const digits = minorDigits(currency);
  const cleaned = text.replace(/[\s,₹]/g, "").replace(/^(rs\.?|inr)/i, "");
  if (cleaned === "") return { ok: false, error: "Enter an amount" };
  if (cleaned.startsWith("-")) return { ok: false, error: "The amount cannot be negative" };
  const pattern = digits === 0 ? /^\d+$/ : new RegExp(`^\\d+(\\.\\d{1,${digits}})?$`);
  if (!pattern.test(cleaned)) {
    return {
      ok: false,
      error:
        digits === 0
          ? "Enter a whole number"
          : `Enter an amount like 1234 or 1234.50 (at most ${digits} decimals)`,
    };
  }
  const [whole, fraction = ""] = cleaned.split(".");
  if (whole.length > 10 || Number(whole) > MAX_MAJOR_AMOUNT) {
    return { ok: false, error: "That amount is too large" };
  }
  const minor = Number(whole) * minorPerMajor(currency) + Number(fraction.padEnd(digits, "0") || 0);
  if (Number(whole) === MAX_MAJOR_AMOUNT && minor > MAX_MAJOR_AMOUNT * minorPerMajor(currency)) {
    return { ok: false, error: "That amount is too large" };
  }
  return { ok: true, minor };
}

/** Typed text for an amount already stored: 123456 becomes "1234.56" (for edit forms). */
export function minorToInput(minor: number, currency: string = DEFAULT_CURRENCY): string {
  const digits = minorDigits(currency);
  if (digits === 0) return String(minor);
  const per = minorPerMajor(currency);
  const whole = Math.trunc(minor / per);
  const fraction = String(minor % per).padStart(digits, "0");
  return `${whole}.${fraction}`;
}

/**
 * `part` as a percentage of `whole`, rounded to one decimal place (47.4), using whole-number maths.
 * Returns null when `whole` is zero or negative, so the screen can show a dash instead of a lie.
 */
export function percentOf(part: number, whole: number): number | null {
  if (whole <= 0) return null;
  return Math.round((part * 1000) / whole) / 10;
}

/** "47.4%" or "—" for null. */
export function formatPercent(value: number | null, locale: string = DEFAULT_LOCALE): string {
  if (value === null) return "—";
  return `${new Intl.NumberFormat(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value)}%`;
}
