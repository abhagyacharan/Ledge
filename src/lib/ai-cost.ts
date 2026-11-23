/**
 * What AI requests cost (docs/plans-module-spec.md §5). Pure integer maths: costs are stored and
 * summed as micro-dollars (one millionth of a dollar), never floats, and worked out from the token
 * counts on every read, so a price change never rewrites history.
 */

export type ModelPrice = {
  /** Micro-dollars per million input tokens ($0.15 per million is 150,000). */
  inputPerMillion: number;
  outputPerMillion: number;
  /** Micro-dollars per hour of audio. */
  audioPerHour: number;
};

/** Prices Groq listed on this day. Update both together. */
export const PRICES_CHECKED_ON = "2026-11-23";

export const MODEL_PRICES: Record<string, ModelPrice> = {
  "openai/gpt-oss-120b": { inputPerMillion: 150_000, outputPerMillion: 600_000, audioPerHour: 0 },
  "whisper-large-v3-turbo": { inputPerMillion: 0, outputPerMillion: 0, audioPerHour: 40_000 },
  // The stand-in used by VOICE_FAKE=1: free, and known, so it is never flagged.
  fake: { inputPerMillion: 0, outputPerMillion: 0, audioPerHour: 0 },
};

/** Groq's basic web search: $5 per 1,000 searches, in micro-dollars each. */
export const WEB_SEARCH_MICROS = 5_000;

export type UsageLike = {
  model: string;
  inputTokens: number;
  outputTokens: number;
  audioSeconds: number;
  webSearches: number;
};

export type CostEstimate = {
  micros: number;
  /** Models with no price in the table (they cost 0 here, so the total is a lower bound). */
  unknownModels: string[];
};

/** Estimated cost of these requests. Sums per model first, then rounds once, to keep it exact. */
export function estimateCost(rows: UsageLike[]): CostEstimate {
  const byModel = new Map<string, { input: number; output: number; audio: number }>();
  let searches = 0;
  for (const r of rows) {
    const sum = byModel.get(r.model) ?? { input: 0, output: 0, audio: 0 };
    sum.input += r.inputTokens;
    sum.output += r.outputTokens;
    sum.audio += r.audioSeconds;
    byModel.set(r.model, sum);
    searches += r.webSearches;
  }
  let micros = searches * WEB_SEARCH_MICROS;
  const unknownModels: string[] = [];
  for (const [model, sum] of byModel) {
    const price = MODEL_PRICES[model];
    if (!price) {
      unknownModels.push(model);
      continue;
    }
    micros +=
      Math.round(
        (sum.input * price.inputPerMillion + sum.output * price.outputPerMillion) / 1_000_000,
      ) + Math.round((sum.audio * price.audioPerHour) / 3600);
  }
  return { micros, unknownModels };
}

/** Estimated cost in whole micro-dollars. */
export function estimateCostMicros(rows: UsageLike[]): number {
  return estimateCost(rows).micros;
}

/** "$0.004", "$1.23", "$0" and "<$0.001" for anything smaller but not zero. */
export function formatUsd(micros: number): string {
  if (micros <= 0) return "$0";
  if (micros < 1_000) return "<$0.001";
  if (micros < 10_000) return `$${(micros / 1_000_000).toFixed(3)}`;
  return `$${(micros / 1_000_000).toFixed(2)}`;
}

/** Micro-dollars to paise, at `usdToInr` paise per dollar (8500 is Rs 85). */
export function microsToPaise(micros: number, usdToInr: number): number {
  return Math.round((micros * usdToInr) / 1_000_000);
}

/** "₹0.30", "₹12.50", "<₹0.01" for a tiny amount, "₹0" for nothing. */
export function formatInr(paise: number): string {
  if (paise <= 0) return "₹0";
  if (paise < 1) return "<₹0.01";
  return `₹${(paise / 100).toFixed(2)}`;
}
