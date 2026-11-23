"use client";

import { ArrowRight, PencilLine } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { dashButton } from "@/components/dash/dash-button";
import { cn } from "@/lib/utils";
import { ConfirmDialog } from "@/modules/todos/components/confirm-dialog";
import { run } from "@/modules/todos/components/run-action";
import { deleteDraftAction } from "../../actions";

/**
 * A plan that was started and never added (docs/plans designs 8a, 8b): a dashed edge, where it
 * stopped ("Draft · question 3 of 5"), the goal quoted with a mouse, Continue and Discard.
 *
 * Discard asks first. A draft has no tasks, but it holds the goal and every answer, and there is
 * no Trash for it, so the calmer choice is one small confirmation instead of an Undo that could
 * not bring the answers back.
 */
export function DraftCard({
  planId,
  title,
  goal,
  stepText,
}: {
  planId: string;
  title: string;
  goal: string;
  stepText: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  function discard() {
    setConfirming(false);
    startTransition(async () => {
      const result = await run(deleteDraftAction({ planId }));
      if (!result.ok) return;
      toast.success(`Discarded "${title}"`);
      router.refresh();
    });
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-2xl border-[1.5px] border-dashed border-dash-ink-soft p-4 transition-opacity duration-150 md:min-h-[196px] md:gap-4 md:rounded-3xl md:p-6",
        pending && "opacity-60",
      )}
    >
      <div className="flex items-center gap-3 md:gap-3.5">
        <span
          aria-hidden
          className="grid size-11 shrink-0 place-items-center rounded-full bg-dash-well text-dash-ink md:size-[52px]"
        >
          <PencilLine className="size-[18px] md:size-5" strokeWidth={1.75} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-base font-semibold break-words md:text-lg">{title}</p>
          <p className="mt-0.5 font-mono text-xs font-medium text-dash-ink-soft md:mt-1">
            {stepText}
          </p>
        </div>
      </div>
      <p className="hidden text-sm leading-relaxed text-dash-ink-soft md:line-clamp-3 md:block">
        &ldquo;{goal}&rdquo;
      </p>
      <div className="flex gap-2 md:mt-auto">
        <Link
          href={`/plans/${planId}/setup`}
          className={cn(
            dashButton({ variant: "secondary" }),
            "h-11 flex-1 md:h-11 md:flex-none md:px-5",
          )}
        >
          Continue
          <ArrowRight aria-hidden />
        </Link>
        <button
          type="button"
          disabled={pending}
          onClick={() => setConfirming(true)}
          aria-label={`Discard ${title}`}
          className={cn(dashButton({ variant: "ghost" }), "h-11 md:h-11 md:px-4")}
        >
          Discard
        </button>
      </div>
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={`Discard "${title}"?`}
        description="Your goal and answers are erased. A draft has no tasks, and this can't be undone."
        confirmLabel="Discard draft"
        onConfirm={discard}
      />
    </div>
  );
}
