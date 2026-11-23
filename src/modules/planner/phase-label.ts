import { daysBetween } from "@/lib/dates";
import type { PlanPhase } from "./schema";

/**
 * How a phase is named everywhere (review, plan page, Plans home): "Week 1 · Your offer". Pure.
 */

/** "Week 1", "Weeks 3–4"; "Day 2" or "Days 3–5" for a plan of two weeks or less. */
export function phasePrefix(phase: PlanPhase, planStart: string, planEnd: string): string {
  const first = Math.max(0, daysBetween(planStart, phase.startDate));
  const last = Math.max(first, daysBetween(planStart, phase.endDate));
  const total = daysBetween(planStart, planEnd) + 1;
  const short = total <= 14;
  const weeks = Math.max(1, Math.round(total / 7));
  const a = short ? first + 1 : Math.min(weeks, Math.floor(first / 7) + 1);
  const b = short ? last + 1 : Math.min(weeks, Math.ceil((last + 1) / 7));
  const unit = short ? "Day" : "Week";
  return a === b ? `${unit} ${a}` : `${unit}s ${a}–${b}`;
}

/** "Week 1 · Your offer" */
export function phaseLabel(phase: PlanPhase, planStart: string, planEnd: string): string {
  return `${phasePrefix(phase, planStart, planEnd)} · ${phase.name}`;
}

/** A plan's phases with their full label as the name, when the plan has dates. */
export function labelPhases<P extends PlanPhase>(
  phases: P[],
  planStart: string | null,
  planEnd: string | null,
): P[] {
  if (!planStart || !planEnd) return phases;
  return phases.map((p) => ({ ...p, name: phaseLabel(p, planStart, planEnd) }));
}
