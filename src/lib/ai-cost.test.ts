import { describe, expect, it } from "vitest";
import {
  estimateCost,
  estimateCostMicros,
  formatInr,
  formatUsd,
  microsToPaise,
  PRICES_CHECKED_ON,
  type UsageLike,
} from "./ai-cost";

const row = (over: Partial<UsageLike> = {}): UsageLike => ({
  model: "openai/gpt-oss-120b",
  inputTokens: 0,
  outputTokens: 0,
  audioSeconds: 0,
  webSearches: 0,
  ...over,
});

describe("AI cost maths", () => {
  it("records when the prices were checked", () => {
    expect(PRICES_CHECKED_ON).toBe("2026-11-23");
  });

  it("prices tokens in integer micro-dollars", () => {
    // 1M in at $0.15 plus 1M out at $0.60.
    expect(estimateCostMicros([row({ inputTokens: 1_000_000, outputTokens: 1_000_000 })])).toBe(
      750_000,
    );
    // One plan from the spec: about 1,100 in and 1,400 out is about a tenth of a cent.
    const micros = estimateCostMicros([row({ inputTokens: 1_100, outputTokens: 1_400 })]);
    expect(micros).toBe(1_005);
    expect(Number.isInteger(micros)).toBe(true);
  });

  it("sums per model before rounding, so many tiny requests are not lost", () => {
    const tiny = Array.from({ length: 1000 }, () => row({ inputTokens: 3 }));
    expect(estimateCostMicros(tiny)).toBe(450);
  });

  it("prices Whisper by the hour and web search per request", () => {
    expect(estimateCostMicros([row({ model: "whisper-large-v3-turbo", audioSeconds: 3600 })])).toBe(
      40_000,
    );
    expect(estimateCostMicros([row({ webSearches: 2 })])).toBe(10_000);
  });

  it("treats the fake model as free and flags unknown models at zero cost", () => {
    expect(estimateCost([row({ model: "fake", inputTokens: 5_000 })])).toEqual({
      micros: 0,
      unknownModels: [],
    });
    expect(estimateCost([row({ model: "mystery", inputTokens: 5_000 })])).toEqual({
      micros: 0,
      unknownModels: ["mystery"],
    });
  });

  it("formats dollars and rupees", () => {
    expect(formatUsd(0)).toBe("$0");
    expect(formatUsd(400)).toBe("<$0.001");
    expect(formatUsd(4_000)).toBe("$0.004");
    expect(formatUsd(1_500_000)).toBe("$1.50");
    expect(microsToPaise(4_000, 8500)).toBe(34);
    expect(formatInr(microsToPaise(4_000, 8500))).toBe("₹0.34");
    expect(formatInr(30)).toBe("₹0.30");
    expect(formatInr(0)).toBe("₹0");
    expect(formatInr(0.2)).toBe("<₹0.01");
  });
});
