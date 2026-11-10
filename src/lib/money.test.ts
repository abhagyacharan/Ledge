import { describe, expect, it } from "vitest";
import {
  formatAmount,
  formatMoney,
  formatPercent,
  minorDigits,
  minorToInput,
  parseMoney,
  percentOf,
} from "./money";

describe("formatMoney", () => {
  it("formats paise as rupees with two decimals", () => {
    expect(formatMoney(2_800_000)).toBe("₹28,000.00");
    expect(formatMoney(1_014_200)).toBe("₹10,142.00");
    expect(formatMoney(5)).toBe("₹0.05");
    expect(formatMoney(0)).toBe("₹0.00");
  });

  it("uses Indian digit grouping (lakhs and crores) for en-IN", () => {
    expect(formatMoney(12_345_600)).toBe("₹1,23,456.00");
    expect(formatMoney(1_234_567_800)).toBe("₹1,23,45,678.00");
  });

  it("uses other grouping for other locales", () => {
    expect(formatMoney(12_345_600, "INR", "en-US")).toBe("₹123,456.00");
    expect(formatMoney(12_345_600, "USD", "en-US")).toBe("$123,456.00");
  });

  it("copes with a currency that has no minor unit", () => {
    expect(minorDigits("JPY")).toBe(0);
    expect(formatMoney(1500, "JPY", "en-US")).toBe("¥1,500");
  });

  it("formats without the symbol for table columns", () => {
    expect(formatAmount(2_800_000)).toBe("28,000.00");
  });

  it("shows large and awkward values exactly", () => {
    expect(formatMoney(99_999_999_999)).toBe("₹99,99,99,999.99");
    expect(formatMoney(1)).toBe("₹0.01");
    expect(formatMoney(10)).toBe("₹0.10");
  });
});

describe("parseMoney", () => {
  it.each([
    ["1234", 123_400],
    ["1234.5", 123_450],
    ["1234.56", 123_456],
    ["0.05", 5],
    ["0", 0],
    ["1,234.50", 123_450],
    ["₹ 1,23,456.78", 12_345_678],
    ["  500  ", 50_000],
    ["Rs. 250", 25_000],
    ["INR 99.99", 9_999],
    ["1000000000", 100_000_000_000],
  ])("reads %s as %i paise", (text, minor) => {
    expect(parseMoney(text)).toEqual({ ok: true, minor });
  });

  it("never loses a paisa to floating point", () => {
    // 0.1 + 0.2 style traps: these must be exact.
    expect(parseMoney("0.29")).toEqual({ ok: true, minor: 29 });
    expect(parseMoney("1.15")).toEqual({ ok: true, minor: 115 });
    expect(parseMoney("19.99")).toEqual({ ok: true, minor: 1999 });
    expect(parseMoney("4.35")).toEqual({ ok: true, minor: 435 });
  });

  it.each([
    ["", "Enter an amount"],
    ["   ", "Enter an amount"],
    ["-5", "The amount cannot be negative"],
    ["abc", "Enter an amount like"],
    ["12.345", "Enter an amount like"],
    ["1.2.3", "Enter an amount like"],
    [".5", "Enter an amount like"],
    ["12abc", "Enter an amount like"],
    ["1000000000.01", "too large"],
    ["99999999999", "too large"],
  ])("refuses %j", (text, message) => {
    const result = parseMoney(text);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain(message);
  });

  it("reads whole numbers only for a currency with no decimals", () => {
    expect(parseMoney("1500", "JPY")).toEqual({ ok: true, minor: 1500 });
    expect(parseMoney("1500.5", "JPY").ok).toBe(false);
  });
});

describe("minorToInput", () => {
  it("turns stored paise back into editable text", () => {
    expect(minorToInput(123_456)).toBe("1234.56");
    expect(minorToInput(5)).toBe("0.05");
    expect(minorToInput(100)).toBe("1.00");
    expect(minorToInput(0)).toBe("0.00");
  });

  it("round-trips with parseMoney", () => {
    for (const minor of [1, 99, 100, 101, 12_345, 999_999_999, 100_000_000_000]) {
      expect(parseMoney(minorToInput(minor))).toEqual({ ok: true, minor });
    }
  });
});

describe("percentOf", () => {
  it("rounds to one decimal using whole-number maths", () => {
    expect(percentOf(1_325_800, 2_800_000)).toBe(47.4); // the sheet's 47.4%
    expect(percentOf(400_000, 460_000)).toBe(87); // transport 87.0%
    expect(percentOf(60_000, 460_000)).toBe(13); // subscriptions 13.0%
    expect(percentOf(1, 3)).toBe(33.3);
    expect(percentOf(2, 3)).toBe(66.7);
  });

  it("handles zero, full and negative parts", () => {
    expect(percentOf(0, 100)).toBe(0);
    expect(percentOf(100, 100)).toBe(100);
    expect(percentOf(-50, 100)).toBe(-50);
  });

  it("returns null instead of dividing by zero or a negative total", () => {
    expect(percentOf(10, 0)).toBeNull();
    expect(percentOf(10, -5)).toBeNull();
  });
});

describe("formatPercent", () => {
  it("shows one decimal, or a dash for nothing", () => {
    expect(formatPercent(47.4)).toBe("47.4%");
    expect(formatPercent(0)).toBe("0.0%");
    expect(formatPercent(-12.5)).toBe("-12.5%");
    expect(formatPercent(null)).toBe("—");
  });
});
