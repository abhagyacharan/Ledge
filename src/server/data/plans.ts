import "server-only";
import { and, asc, count, desc, eq, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import { addDaysIso, daysBetween, todayIn } from "@/lib/dates";
import {
  basicsSchema,
  draftPlanSchema,
  planAnswerSchema,
  planPhaseSchema,
  planQuestionSchema,
  PLAN_WINDOW_DAYS,
  planResourceSchema,
  type DraftPlan,
  type PlanAnswer,
  type PlanBasics,
  type PlanPhase,
  type PlanQuestion,
  type PlanResource,
} from "@/modules/planner/schema";
import {
  makeDateMapper,
  newEndDate,
  rescheduleTasks,
  type Schedule,
} from "@/modules/planner/reschedule";
import { db } from "@/server/db/client";
import {
  lists,
  plans,
  tasks,
  type Plan,
  type PlanStatus,
  type PlanStep,
  type Task,
} from "@/server/db/schema";
import { z } from "zod";
import { getList } from "./lists";
import { labelPhases } from "@/modules/planner/phase-label";
import { getUserSettings } from "./settings";
import { restoreTaskVisibly, trashTask } from "./tasks";
import { deleteTrashedListForever, deleteTrashedTaskForever } from "./trash";

/**
 * Data functions for plans (docs/plans-module-spec.md §6). Every function takes the authenticated
 * `userId` and filters by it (CLAUDE.md §5): someone else's plan looks exactly like one that does
 * not exist. The jsonb columns are checked with Zod when read, so a bad row degrades to "empty"
 * instead of crashing a page.
 */

/** A person may keep this many unfinished drafts. */
export const DRAFT_LIMIT = 20;

export type PlanRecord = {
  id: string;
  title: string;
  goal: string;
  status: PlanStatus;
  step: PlanStep | null;
  startDate: string | null;
  endDate: string | null;
  basics: PlanBasics | null;
  /** null: not asked yet. */
  questions: PlanQuestion[] | null;
  /** Answers to both rounds (follow-up ids start with "f"). */
  answers: PlanAnswer[];
  /** null: the follow-up round has not been asked (and may still be); [] means nothing to ask. */
  followups: PlanQuestion[] | null;
  draft: DraftPlan | null;
  summary: string;
  phases: PlanPhase[];
  resources: PlanResource[];
  listId: string | null;
  listCreated: boolean;
  trashedTaskIds: string[];
  /** The plan's milestone tasks (checkpoints), so its page can mark them. */
  milestoneTaskIds: string[];
  completedAt: Date | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

const lenient = <T extends z.ZodType>(schema: T, value: unknown): z.infer<T> | null => {
  const parsed = schema.safeParse(value);
  return parsed.success ? parsed.data : null;
};

export function toPlanRecord(row: Plan): PlanRecord {
  return {
    id: row.id,
    title: row.title,
    goal: row.goal,
    status: row.status,
    step: row.step,
    startDate: row.startDate,
    endDate: row.endDate,
    basics: lenient(basicsSchema, row.basics),
    questions: lenient(z.array(planQuestionSchema), row.questions),
    answers: lenient(z.array(planAnswerSchema), row.answers) ?? [],
    followups: lenient(z.array(planQuestionSchema), row.followups),
    draft: lenient(draftPlanSchema, row.draft),
    summary: row.summary ?? "",
    phases: lenient(z.array(planPhaseSchema), row.phases) ?? [],
    resources: lenient(z.array(planResourceSchema), row.resources) ?? [],
    listId: row.listId,
    listCreated: row.listCreated,
    trashedTaskIds: lenient(z.array(z.uuid()), row.trashedTaskIds) ?? [],
    milestoneTaskIds: lenient(z.array(z.uuid()), row.milestoneTaskIds) ?? [],
    completedAt: row.completedAt,
    deletedAt: row.deletedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

const owned = (userId: string, planId: string) =>
  and(eq(plans.userId, userId), eq(plans.id, planId));
const live = (userId: string, planId: string) =>
  and(owned(userId, planId), isNull(plans.deletedAt));

/** One plan that is not in Trash. */
export async function getPlan(userId: string, planId: string): Promise<PlanRecord | null> {
  const [row] = await db.select().from(plans).where(live(userId, planId));
  return row ? toPlanRecord(row) : null;
}

/** One plan, trashed or not. */
async function getPlanAnywhere(userId: string, planId: string): Promise<PlanRecord | null> {
  const [row] = await db.select().from(plans).where(owned(userId, planId));
  return row ? toPlanRecord(row) : null;
}

// ---------------------------------------------------------------------------------------------
// Listing, with progress

export type PlanListItem = PlanRecord & {
  progress: { total: number; done: number };
  /** The earliest open dated task, for "next: ..." */
  nextTask: { id: string; title: string; dueDate: string } | null;
  /** Days from today to the end date: 0 on the last day, negative once it has passed. Null with no end. */
  daysLeft: number | null;
  /** Done and total top-level tasks per phase, in phase order (the desktop card's lines). */
  phaseProgress: { id: string; name: string; done: number; total: number }[];
  /** When the plan or any of its tasks last changed: "most recently touched" on Plans and Home. */
  touchedAt: Date;
};

const STATUS_ORDER: Record<PlanStatus, number> = { draft: 0, active: 1, done: 2, archived: 3 };

/**
 * The user's plans (not in Trash), drafts first, then active, done and archived, newest first
 * within each. Progress counts top-level tasks; a repeating task counts once and is done only when
 * it has finished its run (the finished copies a repeat leaves behind are not counted).
 */
export async function listPlans(
  userId: string,
  options: { status?: PlanStatus } = {},
): Promise<PlanListItem[]> {
  const rows = await db
    .select()
    .from(plans)
    .where(
      and(
        eq(plans.userId, userId),
        isNull(plans.deletedAt),
        options.status ? eq(plans.status, options.status) : undefined,
      ),
    )
    .orderBy(desc(plans.updatedAt));
  if (rows.length === 0) return [];

  const settings = await getUserSettings(userId);
  const today = todayIn(settings.timezone);
  const taskRows = await db
    .select({
      id: tasks.id,
      planId: tasks.planId,
      title: tasks.title,
      planPhase: tasks.planPhase,
      status: tasks.status,
      dueDate: tasks.dueDate,
      position: tasks.position,
      updatedAt: tasks.updatedAt,
    })
    .from(tasks)
    .innerJoin(lists, and(eq(lists.id, tasks.listId), eq(lists.userId, userId)))
    .where(
      and(
        eq(tasks.userId, userId),
        inArray(
          tasks.planId,
          rows.map((r) => r.id),
        ),
        isNull(tasks.deletedAt),
        isNull(tasks.parentId),
        isNull(tasks.recurrenceOriginId),
        isNull(lists.deletedAt),
      ),
    )
    .orderBy(asc(tasks.dueDate), asc(tasks.position));

  const items = rows.map((row): PlanListItem => {
    const record = toPlanRecord(row);
    const mine = taskRows.filter((t) => t.planId === row.id);
    const next = mine.find((t) => t.status === "open" && t.dueDate !== null);
    return {
      ...record,
      progress: { total: mine.length, done: mine.filter((t) => t.status === "done").length },
      nextTask: next?.dueDate ? { id: next.id, title: next.title, dueDate: next.dueDate } : null,
      daysLeft: record.endDate ? daysBetween(today, record.endDate) : null,
      phaseProgress: labelPhases(record.phases, record.startDate, record.endDate).map((phase) => {
        const inPhase = mine.filter((t) => t.planPhase === phase.id);
        return {
          id: phase.id,
          name: phase.name,
          done: inPhase.filter((t) => t.status === "done").length,
          total: inPhase.length,
        };
      }),
      touchedAt: mine.reduce(
        (latest, t) => (t.updatedAt > latest ? t.updatedAt : latest),
        record.updatedAt,
      ),
    };
  });
  return items.sort(
    (a, b) =>
      STATUS_ORDER[a.status] - STATUS_ORDER[b.status] ||
      b.updatedAt.getTime() - a.updatedAt.getTime(),
  );
}

/**
 * The plan's tasks: top-level tasks of the plan in phase order, then due date (undated last), then
 * list position, each followed by its subtasks. Tasks in Trash are not included.
 */
export async function getPlanTasks(userId: string, planId: string): Promise<Task[]> {
  const plan = await getPlan(userId, planId);
  if (!plan) return [];
  const top = await db
    .select({ task: tasks })
    .from(tasks)
    .innerJoin(lists, and(eq(lists.id, tasks.listId), eq(lists.userId, userId)))
    .where(
      and(
        eq(tasks.userId, userId),
        eq(tasks.planId, planId),
        isNull(tasks.deletedAt),
        isNull(tasks.parentId),
        isNull(tasks.recurrenceOriginId),
        isNull(lists.deletedAt),
      ),
    );
  const topTasks = top.map((r) => r.task);
  if (topTasks.length === 0) return [];
  const phaseIndex = new Map(plan.phases.map((p, i) => [p.id, i]));
  const rank = (t: Task) => (t.planPhase ? (phaseIndex.get(t.planPhase) ?? 999) : 999);
  topTasks.sort(
    (a, b) =>
      rank(a) - rank(b) ||
      (a.dueDate ?? "9999-12-31").localeCompare(b.dueDate ?? "9999-12-31") ||
      (a.position < b.position ? -1 : a.position > b.position ? 1 : 0),
  );
  const subs = await db
    .select()
    .from(tasks)
    .where(
      and(
        eq(tasks.userId, userId),
        inArray(
          tasks.parentId,
          topTasks.map((t) => t.id),
        ),
        isNull(tasks.deletedAt),
      ),
    )
    .orderBy(asc(tasks.position));
  return topTasks.flatMap((t) => [t, ...subs.filter((s) => s.parentId === t.id)]);
}

// ---------------------------------------------------------------------------------------------
// Drafts

/** Starts a draft at the basics step. Null when the user already has too many drafts. */
export async function createDraft(
  userId: string,
  input: { goal: string; title: string },
): Promise<PlanRecord | null> {
  const [{ n }] = await db
    .select({ n: count() })
    .from(plans)
    .where(and(eq(plans.userId, userId), eq(plans.status, "draft"), isNull(plans.deletedAt)));
  if (n >= DRAFT_LIMIT) return null;
  const [row] = await db
    .insert(plans)
    .values({ userId, goal: input.goal, title: input.title, status: "draft", step: "basics" })
    .returning();
  return toPlanRecord(row);
}

export type DraftPatch = Partial<{
  title: string;
  goal: string;
  step: PlanStep | null;
  basics: PlanBasics | null;
  questions: PlanQuestion[] | null;
  answers: PlanAnswer[] | null;
  followups: PlanQuestion[] | null;
  draft: DraftPlan | null;
  startDate: string | null;
  endDate: string | null;
}>;

/** Changes a draft (only a draft that is not in Trash). Null when there is no such draft. */
export async function updateDraft(
  userId: string,
  planId: string,
  patch: DraftPatch,
): Promise<PlanRecord | null> {
  if (Object.keys(patch).length === 0) return getPlan(userId, planId);
  const [row] = await db
    .update(plans)
    .set(patch)
    .where(and(live(userId, planId), eq(plans.status, "draft")))
    .returning();
  return row ? toPlanRecord(row) : null;
}

/** Deletes a draft for good at once: it has no tasks, so there is nothing to put in Trash. */
export async function deleteDraft(userId: string, planId: string): Promise<boolean> {
  const rows = await db
    .delete(plans)
    .where(and(owned(userId, planId), eq(plans.status, "draft")))
    .returning({ id: plans.id });
  return rows.length > 0;
}

/** Turns a draft into an active plan (Add plan). Null when it is not the user's draft. */
export async function activatePlan(
  userId: string,
  planId: string,
  input: {
    title: string;
    summary: string;
    startDate: string;
    endDate: string;
    phases: PlanPhase[];
    resources: PlanResource[];
    listId: string;
    listCreated: boolean;
    /** Ids of the tasks made from milestone cards. */
    milestoneTaskIds?: string[];
  },
): Promise<PlanRecord | null> {
  const [row] = await db
    .update(plans)
    .set({
      status: "active",
      step: null,
      draft: null,
      completedAt: null,
      title: input.title,
      summary: input.summary,
      startDate: input.startDate,
      endDate: input.endDate,
      phases: input.phases,
      resources: input.resources,
      listId: input.listId,
      listCreated: input.listCreated,
      milestoneTaskIds: input.milestoneTaskIds ?? [],
    })
    .where(and(live(userId, planId), eq(plans.status, "draft")))
    .returning();
  return row ? toPlanRecord(row) : null;
}

/** Undo of Add plan: back to a draft at review with its draft restored. */
export async function revertToDraft(
  userId: string,
  planId: string,
  draft: DraftPlan,
): Promise<PlanRecord | null> {
  const [row] = await db
    .update(plans)
    .set({
      status: "draft",
      step: "review",
      draft,
      title: draft.title,
      summary: null,
      phases: null,
      resources: null,
      startDate: null,
      endDate: null,
      listId: null,
      listCreated: false,
      milestoneTaskIds: [],
      completedAt: null,
    })
    .where(and(live(userId, planId), eq(plans.status, "active")))
    .returning();
  return row ? toPlanRecord(row) : null;
}

// ---------------------------------------------------------------------------------------------
// Living plans

/** Adds task ids to a plan's milestones ("Add more tasks"). Null when it is not the user's plan. */
export async function addPlanMilestones(
  userId: string,
  planId: string,
  taskIds: string[],
): Promise<PlanRecord | null> {
  const plan = await getPlan(userId, planId);
  if (!plan) return null;
  if (taskIds.length === 0) return plan;
  const next = [
    ...plan.milestoneTaskIds,
    ...taskIds.filter((id) => !plan.milestoneTaskIds.includes(id)),
  ];
  const [row] = await db
    .update(plans)
    .set({ milestoneTaskIds: next })
    .where(live(userId, planId))
    .returning();
  return row ? toPlanRecord(row) : null;
}

export async function renamePlan(
  userId: string,
  planId: string,
  title: string,
): Promise<PlanRecord | null> {
  const [row] = await db.update(plans).set({ title }).where(live(userId, planId)).returning();
  return row ? toPlanRecord(row) : null;
}

/** Active, done or archived. Done sets `completed_at`; going back clears it. Drafts have no status to set. */
export async function setPlanStatus(
  userId: string,
  planId: string,
  status: Exclude<PlanStatus, "draft">,
): Promise<PlanRecord | null> {
  const [row] = await db
    .update(plans)
    .set({ status, completedAt: status === "done" ? new Date() : null })
    .where(and(live(userId, planId), sql`${plans.status} <> 'draft'`))
    .returning();
  return row ? toPlanRecord(row) : null;
}

export async function updatePlanResources(
  userId: string,
  planId: string,
  resources: PlanResource[],
): Promise<PlanRecord | null> {
  const [row] = await db
    .update(plans)
    .set({ resources })
    .where(and(live(userId, planId), sql`${plans.status} <> 'draft'`))
    .returning();
  return row ? toPlanRecord(row) : null;
}

export type RescheduleResult =
  | { ok: true; plan: PlanRecord; moved: number }
  | { ok: false; reason: "not_found" | "bad_end_date" };

/**
 * Reschedules a plan with code only (no AI): shift every open task's due date and repeat end by n
 * days, or spread the open dated tasks onto a new end date. Nothing lands before today. Moves the
 * phases and the plan's own list target date with them.
 */
export async function reschedulePlan(
  userId: string,
  planId: string,
  schedule: Schedule,
): Promise<RescheduleResult> {
  const plan = await getPlan(userId, planId);
  if (!plan || plan.status === "draft") return { ok: false, reason: "not_found" };
  const settings = await getUserSettings(userId);
  const today = todayIn(settings.timezone);
  if (schedule.mode === "spread") {
    const max = addDaysIso(today, PLAN_WINDOW_DAYS);
    if (schedule.endDate <= today || schedule.endDate > max) {
      return { ok: false, reason: "bad_end_date" };
    }
  }
  const map = makeDateMapper(schedule, today, plan.endDate);
  const open = await db
    .select({ id: tasks.id, dueDate: tasks.dueDate, recurrenceUntil: tasks.recurrenceUntil })
    .from(tasks)
    .where(
      and(
        eq(tasks.userId, userId),
        eq(tasks.planId, planId),
        eq(tasks.status, "open"),
        isNull(tasks.deletedAt),
        isNull(tasks.parentId),
        isNotNull(tasks.dueDate),
      ),
    );
  const patches = rescheduleTasks(open, map);
  const endDate = newEndDate(schedule, today, plan.endDate);
  const phases = plan.phases.map((p) => ({
    ...p,
    startDate: map(p.startDate),
    endDate: map(p.endDate),
  }));

  const updated = await db.transaction(async (tx) => {
    for (const p of patches) {
      await tx
        .update(tasks)
        .set({ dueDate: p.dueDate, recurrenceUntil: p.recurrenceUntil })
        .where(and(eq(tasks.userId, userId), eq(tasks.id, p.id)));
    }
    if (plan.listCreated && plan.listId && endDate) {
      await tx
        .update(lists)
        .set({ targetDate: endDate })
        .where(and(eq(lists.userId, userId), eq(lists.id, plan.listId)));
    }
    const [row] = await tx
      .update(plans)
      .set({ endDate, phases })
      .where(live(userId, planId))
      .returning();
    return row;
  });
  return { ok: true, plan: toPlanRecord(updated), moved: patches.length };
}

// ---------------------------------------------------------------------------------------------
// Trash

export type TrashPlanResult = { trashedTaskIds: string[]; listTrashed: boolean };

/**
 * Moves a plan to Trash (soft delete). With `withTasks`:
 *  - if the plan made its own list and that list holds only this plan's tasks, the list goes to
 *    Trash too (its tasks go with it, with the same timestamp, so restoring undoes exactly that);
 *  - otherwise each of the plan's tasks is trashed and its id kept in `trashed_task_ids`.
 * Without it the tasks stay where they are. The link stays until the plan is erased for good,
 * which is when the database clears it. Drafts have no Trash (see `deleteDraft`). Null when there
 * is no such plan.
 */
export async function trashPlan(
  userId: string,
  planId: string,
  options: { withTasks: boolean },
): Promise<TrashPlanResult | null> {
  const plan = await getPlan(userId, planId);
  if (!plan || plan.status === "draft") return null;
  const now = new Date();
  let listTrashed = false;
  const trashedTaskIds: string[] = [];

  if (options.withTasks) {
    if (plan.listCreated && plan.listId) {
      const list = await getList(userId, plan.listId);
      if (list && !list.isInbox) {
        const inList = await db
          .select({ planId: tasks.planId })
          .from(tasks)
          .where(
            and(
              eq(tasks.userId, userId),
              eq(tasks.listId, list.id),
              isNull(tasks.deletedAt),
              isNull(tasks.parentId),
            ),
          );
        if (inList.every((t) => t.planId === plan.id)) {
          await db
            .update(lists)
            .set({ deletedAt: now })
            .where(and(eq(lists.userId, userId), eq(lists.id, list.id), isNull(lists.deletedAt)));
          listTrashed = true;
        }
      }
    }
    if (!listTrashed) {
      const mine = await db
        .select({ id: tasks.id })
        .from(tasks)
        .where(
          and(
            eq(tasks.userId, userId),
            eq(tasks.planId, planId),
            isNull(tasks.deletedAt),
            isNull(tasks.parentId),
          ),
        );
      for (const t of mine) if (await trashTask(userId, t.id)) trashedTaskIds.push(t.id);
    }
  }
  await db.update(plans).set({ deletedAt: now, trashedTaskIds }).where(live(userId, planId));
  return { trashedTaskIds, listTrashed };
}

/** Whether the plan's list was trashed together with it (same timestamp). */
async function listTrashedWith(userId: string, plan: PlanRecord): Promise<boolean> {
  if (!plan.listId || !plan.deletedAt) return false;
  const list = await getList(userId, plan.listId, { includeTrashed: true });
  return Boolean(list?.deletedAt && list.deletedAt.getTime() === plan.deletedAt.getTime());
}

/** Takes a plan out of Trash and brings back exactly what went in with it. Null if not in Trash. */
export async function restorePlan(userId: string, planId: string): Promise<PlanRecord | null> {
  const plan = await getPlanAnywhere(userId, planId);
  if (!plan?.deletedAt) return null;
  if (await listTrashedWith(userId, plan)) {
    await db
      .update(lists)
      .set({ deletedAt: null })
      .where(and(eq(lists.userId, userId), eq(lists.id, plan.listId ?? "")));
  }
  for (const id of plan.trashedTaskIds) await restoreTaskVisibly(userId, id);
  const [row] = await db
    .update(plans)
    .set({ deletedAt: null, trashedTaskIds: [] })
    .where(and(owned(userId, planId), isNotNull(plans.deletedAt)))
    .returning();
  return row ? toPlanRecord(row) : null;
}

/**
 * Erases a plan that is in Trash. What was trashed with it (its tasks, or its list with them) goes
 * too; tasks that were left in place keep existing and lose only the link. Null/false when the
 * plan is not in Trash.
 */
export async function deletePlanForever(userId: string, planId: string): Promise<boolean> {
  const plan = await getPlanAnywhere(userId, planId);
  if (!plan?.deletedAt) return false;
  if (plan.listId && (await listTrashedWith(userId, plan))) {
    await deleteTrashedListForever(userId, plan.listId);
  }
  for (const id of plan.trashedTaskIds) await deleteTrashedTaskForever(userId, id);
  const rows = await db
    .delete(plans)
    .where(and(owned(userId, planId), isNotNull(plans.deletedAt)))
    .returning({ id: plans.id });
  return rows.length > 0;
}

/**
 * Takes back what a plan made: deletes the given tasks (and their subtasks) for good, but only
 * those that really carry this plan's id, and, when asked, the plan's list if nothing else is left
 * in it. Used by Undo and by the all-or-nothing rollback. Returns how many tasks were removed.
 */
export async function removePlanWork(
  userId: string,
  planId: string,
  options: { taskIds: string[]; listId?: string | null; deleteListIfEmpty?: boolean },
): Promise<number> {
  let removed = 0;
  if (options.taskIds.length > 0) {
    const rows = await db
      .delete(tasks)
      .where(
        and(eq(tasks.userId, userId), eq(tasks.planId, planId), inArray(tasks.id, options.taskIds)),
      )
      .returning({ id: tasks.id });
    removed = rows.length;
    // Milestones that no longer exist are forgotten (a no-op once the plan reverted to a draft).
    const gone = new Set(rows.map((r) => r.id));
    const plan = await getPlanAnywhere(userId, planId);
    if (plan && plan.milestoneTaskIds.some((id) => gone.has(id))) {
      await db
        .update(plans)
        .set({ milestoneTaskIds: plan.milestoneTaskIds.filter((id) => !gone.has(id)) })
        .where(owned(userId, planId));
    }
  }
  if (options.deleteListIfEmpty && options.listId) {
    const [left] = await db
      .select({ n: count() })
      .from(tasks)
      .where(and(eq(tasks.userId, userId), eq(tasks.listId, options.listId)));
    if (left.n === 0) {
      await db.delete(lists).where(and(eq(lists.userId, userId), eq(lists.id, options.listId)));
    }
  }
  return removed;
}

// ---------------------------------------------------------------------------------------------
// Small reads for the shell, the palette and the task detail

/** Active plans, most recently changed first: the sidebar count and the command palette. */
export async function listActivePlanLinks(
  userId: string,
): Promise<{ id: string; title: string }[]> {
  return db
    .select({ id: plans.id, title: plans.title })
    .from(plans)
    .where(and(eq(plans.userId, userId), eq(plans.status, "active"), isNull(plans.deletedAt)))
    .orderBy(desc(plans.updatedAt));
}

/**
 * The chip on a task's detail ("Start freelancing · Week 1"): the plan's title and the phase's
 * name. Null when the task has no plan or the plan is not the user's or is in Trash.
 */
export async function getTaskPlanChip(
  userId: string,
  task: { planId: string | null; planPhase: string | null },
): Promise<{ planId: string; title: string; phase: string | null } | null> {
  if (!task.planId) return null;
  const plan = await getPlan(userId, task.planId);
  if (!plan || plan.status === "draft") return null;
  const phase = plan.phases.find((p) => p.id === task.planPhase)?.name ?? null;
  return { planId: plan.id, title: plan.title, phase };
}
