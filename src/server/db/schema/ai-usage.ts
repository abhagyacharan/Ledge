import { sql } from "drizzle-orm";
import { check, index, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { id } from "./_columns";
import { user } from "./auth";
import { plans } from "./plans";

export const AI_FEATURES = [
  "voice_transcribe",
  "voice_understand",
  "plan_questions",
  "plan_followups",
  "plan_make",
  "plan_more",
  "plan_links",
] as const;
export type AiFeature = (typeof AI_FEATURES)[number];

/**
 * One row per AI request (docs/plans-module-spec.md §5). Counts only: never words, goals or audio.
 * The cost is worked out from these numbers and the price table in code, so a price change never
 * rewrites history.
 */
export const aiUsage = pgTable(
  "ai_usage",
  {
    id: id(),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    feature: text("feature", { enum: AI_FEATURES }).notNull(),
    model: text("model").notNull(),
    inputTokens: integer("input_tokens").notNull().default(0),
    outputTokens: integer("output_tokens").notNull().default(0),
    audioSeconds: integer("audio_seconds").notNull().default(0),
    webSearches: integer("web_searches").notNull().default(0),
    planId: uuid("plan_id").references(() => plans.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("ai_usage_user_created_idx").on(t.userId, t.createdAt),
    index("ai_usage_plan_idx").on(t.planId),
    check(
      "ai_usage_feature_check",
      sql`${t.feature} in ('voice_transcribe', 'voice_understand', 'plan_questions', 'plan_followups', 'plan_make', 'plan_more', 'plan_links')`,
    ),
  ],
);

export type AiUsageRow = typeof aiUsage.$inferSelect;
