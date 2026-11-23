"use client";

import { ChevronDown, ChevronUp, Eye, EyeOff, Milestone } from "lucide-react";
import { AnimatePresence } from "motion/react";
import { useState } from "react";
import { SectionCard } from "@/components/dash/page-title";
import { useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";
import { TaskRow } from "@/modules/todos/components/task-row";
import type { DateContext } from "@/modules/todos/components/types";
import type { TaskRow as TaskRowData } from "@/server/data/tasks";
import { groupByPhase, visibleTasks, type PhaseGroup } from "../../plan-view";

const foldButton =
  "flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-[13px] font-medium text-dash-ink-soft outline-none transition-colors duration-150 hover:bg-dash-well/70 hover:text-dash-ink focus-visible:ring-3 focus-visible:ring-ring/50 md:min-h-10";

/**
 * A plan's phases as cards of the app's real task rows (docs/plans designs 8j, 8k): the same rows
 * as Today and Upcoming, so ticking, Undo and the detail drawer work exactly as there. A
 * milestone says so on its row. With a mouse the done tasks of a phase fold away while something
 * in it is still open ("Show 3 done"); on a phone a long phase folds its tail ("6 more tasks").
 * A finished or archived plan (`folding` false) is shown in full.
 */
export function PlanTasks({
  phases,
  tasks,
  milestoneIds,
  ctx,
  folding,
}: {
  phases: { id: string; name: string }[];
  /** The plan's tasks with their subtasks, as `getPlanTasks` returns them. */
  tasks: TaskRowData[];
  milestoneIds: string[];
  ctx: DateContext;
  folding: boolean;
}) {
  const desktop = useMediaQuery("(min-width: 768px)");
  const groups = groupByPhase(phases, tasks);
  const milestones = new Set(milestoneIds);

  return (
    <div className="flex flex-col gap-3 md:gap-4">
      {groups.map((group) => (
        <PhaseCard
          key={group.id}
          group={group}
          all={tasks}
          milestones={milestones}
          ctx={ctx}
          desktop={desktop}
          folding={folding}
        />
      ))}
    </div>
  );
}

function PhaseCard({
  group,
  all,
  milestones,
  ctx,
  desktop,
  folding,
}: {
  group: PhaseGroup<TaskRowData>;
  all: TaskRowData[];
  milestones: Set<string>;
  ctx: DateContext;
  desktop: boolean;
  folding: boolean;
}) {
  const [showDone, setShowDone] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const { shown, hiddenDone, hiddenMore } = visibleTasks(group.tasks, {
    desktop,
    showDone,
    expanded,
    folding,
  });
  // The fold buttons stay after they have been used, so the choice can be undone.
  const canHideDone = desktop && folding && showDone && group.done > 0 && group.done < group.total;
  const canCollapse = !desktop && folding && expanded && group.total > 7;
  const headingId = `phase-${group.id}`;

  return (
    <SectionCard
      id={headingId}
      heading={<span className="text-[15px] font-semibold">{group.name}</span>}
      aside={
        <span className="font-mono text-xs font-medium text-dash-ink-soft">
          {group.done} of {group.total}
          <span className="sr-only"> done</span>
        </span>
      }
      className="md:px-5"
    >
      {group.total === 0 ? (
        <p className="py-3 text-[13px] text-dash-ink-soft">No tasks in this phase yet.</p>
      ) : (
        <ul>
          <AnimatePresence initial={false}>
            {shown.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                subtasks={all.filter((t) => t.parentId === task.id)}
                ctx={ctx}
                marker={milestones.has(task.id) ? <MilestoneMark /> : undefined}
              />
            ))}
          </AnimatePresence>
        </ul>
      )}

      {hiddenDone > 0 ? (
        <button type="button" onClick={() => setShowDone(true)} className={foldButton}>
          <Eye aria-hidden className="size-4 w-5" />
          Show {hiddenDone} done
        </button>
      ) : null}
      {canHideDone ? (
        <button type="button" onClick={() => setShowDone(false)} className={foldButton}>
          <EyeOff aria-hidden className="size-4 w-5" />
          Hide {group.done} done
        </button>
      ) : null}
      {hiddenMore > 0 ? (
        <button type="button" onClick={() => setExpanded(true)} className={foldButton}>
          <ChevronDown aria-hidden className="size-4 w-5" />
          {hiddenMore} more {hiddenMore === 1 ? "task" : "tasks"}
        </button>
      ) : null}
      {canCollapse ? (
        <button type="button" onClick={() => setExpanded(false)} className={foldButton}>
          <ChevronUp aria-hidden className="size-4 w-5" />
          Show fewer
        </button>
      ) : null}
    </SectionCard>
  );
}

/** "Milestone" with its icon, in a row's details line: a word and an icon, not colour alone. */
function MilestoneMark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 font-semibold text-dash-ink", className)}>
      <Milestone aria-hidden className="size-3.5" />
      Milestone
    </span>
  );
}
