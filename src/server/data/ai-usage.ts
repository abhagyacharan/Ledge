import "server-only";
import { and, count, eq, inArray, sql, sum } from "drizzle-orm";
import { addMonthsIso } from "@/lib/dates";
import { estimateCost } from "@/lib/ai-cost";
import { db } from "@/server/db/client";
import { aiUsage, plans, type AiFeature } from "@/server/db/schema";
import { getUserSettings } from "./settings";

/**
 * AI usage (docs/plans-module-spec.md §5): one row per request, counts only. Never words, goals or
 * audio. Every function takes `userId` and filters by it.
 */

export type AiUsageInput = {
  feature: AiFeature;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
  audioSeconds?: number;
  webSearches?: number;
  planId?: string | null;
};

/**
 * Writes one usage row. It never throws into the user's request: a failure is logged (without the
 * counts' context) and the request carries on.
 */
export async function recordAiUsage(userId: string, input: AiUsageInput): Promise<void> {
  try {
    let planId = input.planId ?? null;
    if (planId) {
      // The plan must be the user's own; otherwise the usage is recorded without it.
      const [own] = await db
        .select({ id: plans.id })
        .from(plans)
        .where(and(eq(plans.id, planId), eq(plans.userId, userId)));
      if (!own) planId = null;
    }
    await db.insert(aiUsage).values({
      userId,
      feature: input.feature,
      model: input.model,
      inputTokens: Math.max(0, Math.round(input.inputTokens ?? 0)),
      outputTokens: Math.max(0, Math.round(input.outputTokens ?? 0)),
      audioSeconds: Math.max(0, Math.round(input.audioSeconds ?? 0)),
      webSearches: Math.max(0, Math.round(input.webSearches ?? 0)),
      planId,
    });
  } catch (error) {
    console.error("Could not record AI usage:", error instanceof Error ? error.message : error);
  }
}

export type FeatureUsage = {
  feature: AiFeature;
  requests: number;
  inputTokens: number;
  outputTokens: number;
  audioSeconds: number;
  webSearches: number;
  costMicros: number;
  unknownModels: string[];
};

export type MonthUsage = {
  /** "2026-11" */
  month: string;
  requests: number;
  inputTokens: number;
  outputTokens: number;
  audioSeconds: number;
  webSearches: number;
  costMicros: number;
  unknownModels: string[];
  features: FeatureUsage[];
};

const emptyMonth = (month: string): MonthUsage => ({
  month,
  requests: 0,
  inputTokens: 0,
  outputTokens: 0,
  audioSeconds: 0,
  webSearches: 0,
  costMicros: 0,
  unknownModels: [],
  features: [],
});

/**
 * This month and last month, per feature: requests, tokens, audio seconds and the estimated cost.
 * Months are read in the user's time zone. `month` ("2026-11") defaults to the current month.
 */
export async function getAiUsageSummary(
  userId: string,
  options: { month?: string } = {},
): Promise<{ thisMonth: MonthUsage; lastMonth: MonthUsage }> {
  const settings = await getUserSettings(userId);
  const month =
    options.month ??
    new Intl.DateTimeFormat("en-CA", {
      timeZone: settings.timezone,
      year: "numeric",
      month: "2-digit",
    })
      .format(new Date())
      .slice(0, 7);
  const previous = addMonthsIso(`${month}-01`, -1).slice(0, 7);

  // Inlined (not a bound parameter) so select, where and group by are the same expression. The zone
  // was validated when it was saved; anything odd falls back to UTC.
  const zone = /^[A-Za-z0-9_/+-]+$/.test(settings.timezone) ? settings.timezone : "UTC";
  const monthOf = sql<string>`to_char(${aiUsage.createdAt} at time zone '${sql.raw(zone)}', 'YYYY-MM')`;
  const rows = await db
    .select({
      month: monthOf,
      feature: aiUsage.feature,
      model: aiUsage.model,
      requests: count(),
      inputTokens: sum(aiUsage.inputTokens),
      outputTokens: sum(aiUsage.outputTokens),
      audioSeconds: sum(aiUsage.audioSeconds),
      webSearches: sum(aiUsage.webSearches),
    })
    .from(aiUsage)
    .where(and(eq(aiUsage.userId, userId), inArray(monthOf, [month, previous])))
    .groupBy(monthOf, aiUsage.feature, aiUsage.model);

  const build = (wanted: string): MonthUsage => {
    const result = emptyMonth(wanted);
    const byFeature = new Map<AiFeature, typeof rows>();
    for (const r of rows.filter((x) => x.month === wanted)) {
      byFeature.set(r.feature, [...(byFeature.get(r.feature) ?? []), r]);
    }
    const all: typeof rows = [];
    for (const [feature, group] of byFeature) {
      const usage = group.map((g) => ({
        model: g.model,
        inputTokens: Number(g.inputTokens ?? 0),
        outputTokens: Number(g.outputTokens ?? 0),
        audioSeconds: Number(g.audioSeconds ?? 0),
        webSearches: Number(g.webSearches ?? 0),
      }));
      const cost = estimateCost(usage);
      const entry: FeatureUsage = {
        feature,
        requests: group.reduce((n, g) => n + g.requests, 0),
        inputTokens: usage.reduce((n, u) => n + u.inputTokens, 0),
        outputTokens: usage.reduce((n, u) => n + u.outputTokens, 0),
        audioSeconds: usage.reduce((n, u) => n + u.audioSeconds, 0),
        webSearches: usage.reduce((n, u) => n + u.webSearches, 0),
        costMicros: cost.micros,
        unknownModels: cost.unknownModels,
      };
      result.features.push(entry);
      all.push(...group);
    }
    result.features.sort((a, b) => b.costMicros - a.costMicros || b.requests - a.requests);
    // The month's total is priced as a whole (sum per model, then round once).
    const total = estimateCost(
      all.map((g) => ({
        model: g.model,
        inputTokens: Number(g.inputTokens ?? 0),
        outputTokens: Number(g.outputTokens ?? 0),
        audioSeconds: Number(g.audioSeconds ?? 0),
        webSearches: Number(g.webSearches ?? 0),
      })),
    );
    result.costMicros = total.micros;
    result.unknownModels = total.unknownModels;
    for (const f of result.features) {
      result.requests += f.requests;
      result.inputTokens += f.inputTokens;
      result.outputTokens += f.outputTokens;
      result.audioSeconds += f.audioSeconds;
      result.webSearches += f.webSearches;
    }
    return result;
  };

  return { thisMonth: build(month), lastMonth: build(previous) };
}

export type PlanAiUsage = {
  requests: number;
  inputTokens: number;
  outputTokens: number;
  /** Input plus output. */
  tokens: number;
  costMicros: number;
  unknownModels: string[];
};

/** What one plan's AI requests used and (roughly) cost. Zero for a plan that is not the user's. */
export async function getPlanAiUsage(userId: string, planId: string): Promise<PlanAiUsage> {
  const rows = await db
    .select({
      model: aiUsage.model,
      requests: count(),
      inputTokens: sum(aiUsage.inputTokens),
      outputTokens: sum(aiUsage.outputTokens),
      audioSeconds: sum(aiUsage.audioSeconds),
      webSearches: sum(aiUsage.webSearches),
    })
    .from(aiUsage)
    .where(and(eq(aiUsage.userId, userId), eq(aiUsage.planId, planId)))
    .groupBy(aiUsage.model);
  const usage = rows.map((r) => ({
    model: r.model,
    inputTokens: Number(r.inputTokens ?? 0),
    outputTokens: Number(r.outputTokens ?? 0),
    audioSeconds: Number(r.audioSeconds ?? 0),
    webSearches: Number(r.webSearches ?? 0),
  }));
  const cost = estimateCost(usage);
  const inputTokens = usage.reduce((n, u) => n + u.inputTokens, 0);
  const outputTokens = usage.reduce((n, u) => n + u.outputTokens, 0);
  return {
    requests: rows.reduce((n, r) => n + r.requests, 0),
    inputTokens,
    outputTokens,
    tokens: inputTokens + outputTokens,
    costMicros: cost.micros,
    unknownModels: cost.unknownModels,
  };
}
