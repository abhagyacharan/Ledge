import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { createdAt, id, updatedAt } from "./_columns";
import { user } from "./auth";
import { lists } from "./lists";

export const PLAN_STATUSES = ["draft", "active", "done", "archived"] as const;
export type PlanStatus = (typeof PLAN_STATUSES)[number];

export const PLAN_STEPS = ["goal", "basics", "questions", "followups", "making", "review"] as const;
export type PlanStep = (typeof PLAN_STEPS)[number];

/**
 * A plan (docs/plans-module-spec.md §6): the goal, the answers, its phases and resources, and the
 * link to the list its tasks live in. The jsonb columns are validated with Zod when read
 * (src/server/data/plans.ts), so a bad row can never crash a page.
 */
export const plans = pgTable(
  "plans",
  {
    id: id(),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    goal: text("goal").notNull(),
    status: text("status", { enum: PLAN_STATUSES }).notNull().default("draft"),
    /** For drafts: the step to resume at. */
    step: text("step", { enum: PLAN_STEPS }),
    startDate: date("start_date", { mode: "string" }),
    endDate: date("end_date", { mode: "string" }),
    basics: jsonb("basics"),
    questions: jsonb("questions"),
    answers: jsonb("answers"),
    /** The follow-up round that was asked (null: not asked yet; empty: nothing to ask). */
    followups: jsonb("followups"),
    /** The unsaved review while a draft; cleared by Add plan. */
    draft: jsonb("draft"),
    summary: text("summary"),
    phases: jsonb("phases"),
    resources: jsonb("resources"),
    listId: uuid("list_id").references(() => lists.id, { onDelete: "set null" }),
    /** True when the plan made its own list (so deleting the plan may trash the list). */
    listCreated: boolean("list_created").notNull().default(false),
    /** Task ids trashed together with the plan, so restoring brings back exactly those. */
    trashedTaskIds: jsonb("trashed_task_ids"),
    /** Ids of the plan's milestone tasks (checkpoints, saved as priority 3), so its page can mark them. */
    milestoneTaskIds: jsonb("milestone_task_ids")
      .notNull()
      .default(sql`'[]'::jsonb`),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    /** Soft delete: set means the plan is in Trash. */
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("plans_user_status_idx")
      .on(t.userId, t.status)
      .where(sql`${t.deletedAt} is null`),
    check("plans_title_check", sql`char_length(${t.title}) between 1 and 80`),
    check("plans_goal_check", sql`char_length(${t.goal}) <= 1000`),
    check("plans_status_check", sql`${t.status} in ('draft', 'active', 'done', 'archived')`),
    check(
      "plans_step_check",
      sql`${t.step} is null or ${t.step} in ('goal', 'basics', 'questions', 'followups', 'making', 'review')`,
    ),
  ],
);

export type Plan = typeof plans.$inferSelect;
export type NewPlan = typeof plans.$inferInsert;
