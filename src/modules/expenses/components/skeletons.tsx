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

/** An entry area (screens 3b, 3c, 6e, 6f): the total, the breakdown card, the list card. */
export function EntriesSkeleton() {
  return (
    <Loading
      label="Loading entries"
      className="grid gap-3 pb-20 md:gap-4 xl:grid-cols-12 xl:grid-rows-[auto_1fr] xl:items-start"
    >
      <div aria-hidden className="flex items-baseline gap-3 xl:col-span-4 xl:row-start-1">
        <Bone className="h-9 w-40 md:h-10" />
        <Bone className="h-3 w-16" />
      </div>

      <Card className="xl:col-span-4 xl:row-start-2">
        <Bone className="h-2.5 rounded-full" />
        <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2">
          {["w-24", "w-20", "w-28", "w-16"].map((w, i) => (
            <Bone key={i} className={cn("h-3.5", w)} />
          ))}
        </div>
      </Card>

      <Card className="xl:col-span-8 xl:col-start-5 xl:row-span-2 xl:row-start-1">
        <Bone className="h-11 rounded-full md:h-9" />
        <div className="mt-3 flex gap-2 overflow-hidden">
          {["w-14", "w-20", "w-20", "w-28", "w-28"].map((w, i) => (
            <Bone key={i} className={cn("h-11 shrink-0 rounded-full md:h-9", w)} />
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

/** The Summary (screens 3a and 3f): the sum or five tiles, then the breakdown and cash flow. */
export function SummarySkeleton() {
  return (
    <Loading label="Loading summary" className="flex flex-col gap-3 md:gap-4">
      {/* Phone: the sum and two small tiles. */}
      <div className="flex flex-col gap-2.5 md:hidden">
        <Card className="py-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex justify-between py-2">
              <Bone className="h-4 w-28" />
              <Bone className="h-4 w-20" />
            </div>
          ))}
          <Bone className="mt-2 h-1 rounded-none" />
          <div className="mt-3 flex items-end justify-between">
            <Bone className="h-4 w-24" />
            <Bone className="h-8 w-32" />
          </div>
        </Card>
        <div className="grid grid-cols-2 gap-2.5">
          {[0, 1].map((i) => (
            <Card key={i} className="p-3.5 sm:p-3.5 md:p-3.5">
              <Bone className="h-3.5 w-16" />
              <Bone className="mt-2 h-6 w-20" />
            </Card>
          ))}
        </div>
      </div>
      {/* Desktop: five tiles. */}
      <div className="hidden grid-cols-2 gap-3 md:grid lg:grid-cols-5">
        {[0, 1, 2, 3, 4].map((i) => (
          <Card key={i} className="h-28 p-4 md:p-4">
            <Bone className="h-3.5 w-20" />
            <Bone className="mt-2 h-7 w-28" />
          </Card>
        ))}
      </div>
      <div className="grid gap-3 md:gap-4 xl:grid-cols-12">
        <Card className="xl:order-last xl:col-span-5">
          <Bone className="h-4 w-32" />
          {[0, 1, 2, 3, 4].map((r) => (
            <div
              key={r}
              className="flex flex-col gap-2 border-b border-dash-edge py-3 last:border-0"
            >
              <div className="flex justify-between">
                <Bone className="h-3.5 w-32" />
                <Bone className="h-3.5 w-16" />
              </div>
              <Bone className="h-1.5 rounded-full" />
            </div>
          ))}
        </Card>
        <Card className="xl:col-span-7">
          <Bone className="h-4 w-44" />
          <Bone className="mt-5 h-56 rounded-[20px]" />
        </Card>
      </div>
    </Loading>
  );
}
