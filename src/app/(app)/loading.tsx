import { Skeleton } from "@/components/ui/skeleton";

/** Shown while a view loads. Same shape as a task screen so nothing jumps when it arrives. */
export default function Loading() {
  return (
    <div role="status" aria-label="Loading">
      <Skeleton className="mb-2 h-8 w-48" />
      <Skeleton className="mb-6 h-4 w-72" />
      <div className="flex flex-col gap-1">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="flex items-center gap-3 border-b py-3">
            <Skeleton className="size-5 rounded-full" />
            <Skeleton className="h-4 flex-1" style={{ maxWidth: `${60 + ((i * 13) % 30)}%` }} />
          </div>
        ))}
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}
