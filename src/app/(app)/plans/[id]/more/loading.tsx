import { ReviewSkeleton } from "@/modules/planner/components/flow/making-step";

/** Placeholder for the suggestions review, at the card's real size (screen 8g). */
export default function PlanMoreLoading() {
  return (
    <div
      className="dash mx-auto flex min-h-[calc(100dvh-9rem)] w-full max-w-xl flex-col gap-3.5"
      aria-busy="true"
    >
      <p className="sr-only" role="status">
        Loading
      </p>
      <ReviewSkeleton />
    </div>
  );
}
