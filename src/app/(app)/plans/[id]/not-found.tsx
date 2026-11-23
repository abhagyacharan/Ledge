import { Target } from "lucide-react";
import Link from "next/link";
import { dashButton } from "@/components/dash/dash-button";
import { EmptyState } from "@/components/shell/empty-state";
import { cn } from "@/lib/utils";

/** A plan that does not exist (or belongs to someone else) lands here. */
export default function PlanNotFound() {
  return (
    <div className="dash mx-auto max-w-[880px]">
      <div className="rounded-3xl border border-dash-edge bg-dash-card p-2 shadow-(--dash-card-shadow)">
        <EmptyState
          icon={Target}
          title="We couldn't find that plan"
          hint="It may have been deleted, or the link may be wrong. A deleted plan can be restored from Trash for 30 days."
          action={
            <Link href="/plans" className={cn(dashButton(), "h-12 px-5 md:h-11")}>
              Back to Plans
            </Link>
          }
        />
      </div>
    </div>
  );
}
