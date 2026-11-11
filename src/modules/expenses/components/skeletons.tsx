import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Loading placeholders for the expense tabs. Each one has the geometry of the screen it stands
 * in for (cards, rows, pills at their real sizes), so nothing moves when the content arrives.
 */

function Bone({ className }: { className?: string }) {
  return <div aria-hidden className={cn("dash-skeleton", className)} />;
}

function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div
      aria-hidden
      className={cn(
        "min-w-0 rounded-2xl border border-dash-edge bg-dash-card px-4 py-5 shadow-(--dash-card-shadow) sm:p-5 md:rounded-3xl md:p-6",
        className,
      )}
    >
      {children}
    </div>
  );
}

function Loading({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div role="status" aria-label={label} className={cn("dash", className)}>
      {children}
      <span className="sr-only">{label}…</span>
    </div>
  );
}

const ROW_WIDTHS = ["w-40", "w-28", "w-48", "w-32", "w-36", "w-24"];

export function EntriesSkeleton() {
  return (
    <Loading
      label="Loading entries"
      className="grid gap-4 pb-20 xl:grid-cols-12 xl:grid-rows-[auto_1fr] xl:items-start"
    >
      <Card className="xl:col-span-4 xl:row-start-1">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between xl:flex-col xl:items-stretch">
          <div>
            <Bone className="h-4 w-40" />
            <Bone className="mt-3 h-9 w-48" />
            <Bone className="mt-2 h-3.5 w-16" />
          </div>
          <Bone className="h-11 rounded-full sm:w-40 md:h-10 xl:w-auto" />
        </div>
      </Card>

      <Card className="hidden xl:col-span-4 xl:row-start-2 xl:block">
        <Bone className="h-4 w-36" />
        <div className="mt-5 flex flex-col gap-4">
          {[0.8, 0.55, 0.35].map((f) => (
            <div key={f} className="flex flex-col gap-2">
              <div className="flex justify-between">
                <Bone className="h-3.5 w-24" />
                <Bone className="h-3.5 w-20" />
              </div>
              <Bone className="h-1.5 rounded-full" />
            </div>
          ))}
        </div>
      </Card>

      <Card className="xl:col-span-8 xl:col-start-5 xl:row-span-2 xl:row-start-1">
        <div className="flex gap-2">
          <Bone className="h-11 flex-1 rounded-full md:h-9" />
          <Bone className="h-11 w-32 rounded-full md:h-9" />
        </div>
        <div className="mt-3 flex gap-2 overflow-hidden">
          {["w-12", "w-24", "w-28", "w-20", "w-24"].map((w, i) => (
            <Bone key={i} className={cn("h-11 shrink-0 rounded-full md:h-8", w)} />
          ))}
        </div>
        <ul className="mt-3">
          {ROW_WIDTHS.map((w, i) => (
            <li key={i} className="flex min-h-15 items-center gap-3 py-2.5">
              <Bone className="size-10 shrink-0 rounded-full" />
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <Bone className={cn("h-3.5 max-w-full", w)} />
                <Bone className="h-3 w-24 max-w-full" />
              </div>
              <Bone className="h-3.5 w-16" />
            </li>
          ))}
        </ul>
      </Card>
    </Loading>
  );
}

export function SummarySkeleton() {
  return (
    <Loading label="Loading summary" className="grid gap-4 xl:grid-cols-12">
      <Card className="xl:col-span-6">
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-5 md:gap-6">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex h-32 flex-col gap-3 rounded-[20px] bg-dash-well p-3.5 sm:h-40 sm:p-4"
            >
              <div className="flex justify-between">
                <div className="dash-skeleton h-3.5 w-24 bg-dash-card" />
                <div className="dash-skeleton hidden size-9 rounded-full bg-dash-card sm:block" />
              </div>
              <div className="dash-skeleton h-7 w-32 bg-dash-card" />
              <div className="dash-skeleton h-4 w-20 rounded-full bg-dash-card" />
            </div>
          ))}
        </div>
      </Card>
      <Card className="xl:col-span-6">
        <Bone className="h-4 w-36" />
        <Bone className="mt-2 h-3.5 w-56" />
        <Bone className="mt-5 h-56 rounded-[20px]" />
      </Card>
      {[0, 1].map((i) => (
        <Card key={i} className="xl:col-span-6">
          <Bone className="h-4 w-44" />
          <Bone className="mt-2 h-3.5 w-28" />
          <Bone className="mt-5 h-9 rounded-xl" />
          <div className="mt-2 flex flex-col">
            {[0, 1, 2, 3, 4].map((r) => (
              <div key={r} className="flex justify-between border-b border-dash-edge py-3">
                <Bone className="h-3.5 w-32" />
                <Bone className="h-3.5 w-20" />
              </div>
            ))}
          </div>
        </Card>
      ))}
    </Loading>
  );
}
