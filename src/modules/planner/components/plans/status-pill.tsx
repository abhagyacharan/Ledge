import { Archive, Check, CirclePlay, PencilLine, type LucideIcon } from "lucide-react";
import type { PlanStatus } from "@/server/db/schema";
import { cn } from "@/lib/utils";

const PILLS: Record<PlanStatus, { label: string; icon: LucideIcon; tone: string }> = {
  draft: { label: "Draft", icon: PencilLine, tone: "bg-dash-well text-dash-ink" },
  active: { label: "Active", icon: CirclePlay, tone: "bg-dash-well text-dash-ink" },
  done: { label: "Done", icon: Check, tone: "bg-dash-good-bg text-dash-good" },
  archived: { label: "Archived", icon: Archive, tone: "bg-dash-well text-dash-ink-soft" },
};

/** The plan's status as a word and an icon, never colour alone (docs/plans designs 8b, 8j, 8l). */
export function StatusPill({ status, className }: { status: PlanStatus; className?: string }) {
  const pill = PILLS[status];
  return (
    <span
      className={cn(
        "inline-flex h-[22px] items-center gap-1 rounded-full px-2.5 text-[11px] font-semibold whitespace-nowrap",
        pill.tone,
        className,
      )}
    >
      <pill.icon aria-hidden className="size-3" strokeWidth={2.25} />
      {pill.label}
    </span>
  );
}
