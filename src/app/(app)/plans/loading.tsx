/**
 * Plans home while it loads (docs/plans designs 8a, 8b): the title, the filter chips and cards at
 * their real sizes, so nothing jumps when the page arrives.
 */
export default function Loading() {
  return (
    <div role="status" aria-label="Loading plans" className="dash mx-auto max-w-[880px]">
      <div aria-hidden className="mb-5 flex items-end justify-between gap-3 md:mb-6">
        <div>
          <div className="dash-skeleton h-8 w-28 md:h-10 md:w-36" />
          <div className="mt-3 hidden dash-skeleton h-3.5 w-80 md:block" />
        </div>
        <div className="dash-skeleton h-11 w-32 rounded-full" />
      </div>
      <div aria-hidden className="flex gap-1.5">
        {[88, 80, 72, 96].map((w) => (
          <div key={w} className="dash-skeleton h-11 rounded-full" style={{ width: w }} />
        ))}
      </div>
      <div aria-hidden className="mt-4 grid gap-3 md:grid-cols-2 md:gap-4">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="flex flex-col gap-4 rounded-2xl border border-dash-edge bg-dash-card p-4 shadow-(--dash-card-shadow) md:min-h-[196px] md:rounded-3xl md:p-6"
          >
            <div className="flex items-center gap-4">
              <div className="dash-skeleton size-[52px] shrink-0 rounded-full md:size-16" />
              <div className="flex flex-1 flex-col gap-2">
                <div className="dash-skeleton h-4 w-40" />
                <div className="dash-skeleton h-3 w-28" />
              </div>
            </div>
            <div className="hidden flex-col gap-2 md:flex">
              <div className="dash-skeleton h-3 w-full" />
              <div className="dash-skeleton h-3 w-full" />
              <div className="dash-skeleton h-3 w-3/4" />
            </div>
          </div>
        ))}
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}
