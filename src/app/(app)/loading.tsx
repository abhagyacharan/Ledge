/**
 * Shown while a view loads (docs/new_design.md screen 2i, "Loading"): a title, a mono line and a
 * card of task rows at their real sizes, so nothing jumps when the page arrives.
 */
export default function Loading() {
  return (
    <div role="status" aria-label="Loading" className="dash">
      <div aria-hidden className="mb-5 md:mb-6">
        <div className="dash-skeleton h-8 w-44 md:h-10" />
        <div className="mt-2 dash-skeleton h-3 w-56" />
      </div>
      <div
        aria-hidden
        className="rounded-2xl border border-dash-edge bg-dash-card px-4 py-3 shadow-(--dash-card-shadow) md:px-5"
      >
        <div className="mb-2 dash-skeleton h-3.5 w-20" />
        {[64, 48, 72, 40, 56].map((w, i) => (
          <div key={i} className="flex items-center gap-3 py-3">
            <div className="dash-skeleton size-5 shrink-0 rounded-full" />
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <div className="dash-skeleton h-3.5" style={{ width: `${w}%` }} />
              <div className="dash-skeleton h-3 w-28" />
            </div>
          </div>
        ))}
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}
