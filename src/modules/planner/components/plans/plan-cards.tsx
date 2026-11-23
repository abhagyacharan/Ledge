"use client";

import { Archive, Check, ListPlus } from "lucide-react";
import Link from "next/link";
import { useTransition, type ReactNode } from "react";
import { dashButton } from "@/components/dash/dash-button";
import { cn } from "@/lib/utils";
import { run, undoToast } from "@/modules/todos/components/run-action";
import { setPlanStatusAction } from "../../actions";

const card =
  "rounded-2xl border border-dash-edge bg-dash-card p-4 text-dash-ink shadow-(--dash-card-shadow)";

/**
 * "Add more tasks" (docs/plans designs 8j): Ledge suggests next steps from what is done and what
 * is open. Suggest goes to `/plans/[id]/more`, which reviews them like a new plan's cards.
 */
export function AddMoreCard({ planId, available }: { planId: string; available: boolean }) {
  return (
    <div className={cn(card, "flex min-h-[76px] items-center gap-3 py-3")}>
      <span
        aria-hidden
        className="grid size-10 shrink-0 place-items-center rounded-full bg-dash-well"
      >
        <ListPlus className="size-[18px]" strokeWidth={1.75} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-semibold">Add more tasks</p>
        <p className="mt-0.5 text-[13px] leading-snug text-dash-ink-soft">
          {available
            ? "Ledge suggests next steps from what you've done."
            : "The planner isn't set up on this server."}
        </p>
      </div>
      {available ? (
        <Link
          href={`/plans/${planId}/more`}
          className={cn(
            dashButton({ variant: "well" }),
            "h-10 px-4 text-[13px] font-semibold md:h-10",
          )}
        >
          Suggest
        </Link>
      ) : null}
    </div>
  );
}

/** Changes the plan's status with an Undo that puts the old one back. */
function useStatus(planId: string, before: "active" | "done" | "archived") {
  const [pending, startTransition] = useTransition();
  function set(next: "active" | "done" | "archived", message: string) {
    startTransition(async () => {
      const result = await run(setPlanStatusAction({ planId, status: next }));
      if (!result.ok) return;
      undoToast(message, () => void run(setPlanStatusAction({ planId, status: before })));
    });
  }
  return { pending, set };
}

/**
 * Every task is done but the plan is still active: a quiet prompt to mark it done (spec 2e). It
 * never changes the status by itself.
 */
export function MarkDoneCard({ planId, title }: { planId: string; title: string }) {
  const { pending, set } = useStatus(planId, "active");
  return (
    <div className={cn(card, "flex flex-col gap-2.5")}>
      <p className="text-[15px] font-semibold">Everything is ticked off.</p>
      <p className="text-sm leading-relaxed text-dash-ink-soft">
        Mark the plan done to keep it as a record of a finished goal. Its tasks stay where they are.
      </p>
      <div>
        <button
          type="button"
          disabled={pending}
          onClick={() => set("done", `Marked "${title}" done`)}
          className={cn(dashButton({ variant: "secondary" }), "h-11 gap-2 px-5 md:h-11")}
        >
          <Check aria-hidden />
          Mark done
        </button>
      </div>
    </div>
  );
}

/** A finished plan (docs/plans designs 8l, "Done plan"): a calm note with what to do next. */
export function DoneCard({
  planId,
  title,
  summary,
}: {
  planId: string;
  title: string;
  summary: ReactNode;
}) {
  const { pending, set } = useStatus(planId, "done");
  return (
    <div className={cn(card, "flex flex-col gap-2.5")}>
      <p className="text-[15px] font-semibold">Nicely done.</p>
      <p className="text-sm leading-relaxed text-dash-ink-soft">{summary}</p>
      <div className="flex gap-2">
        <Link
          href="/plans/new"
          className={cn(
            dashButton({ variant: "secondary" }),
            "h-11 flex-1 text-sm md:h-11 md:flex-none md:px-5",
          )}
        >
          Plan what&apos;s next
        </Link>
        <button
          type="button"
          disabled={pending}
          onClick={() => set("archived", `Archived "${title}"`)}
          className={cn(dashButton({ variant: "well" }), "h-11 gap-1.5 px-4 md:h-11")}
        >
          <Archive aria-hidden />
          Archive
        </button>
      </div>
    </div>
  );
}
