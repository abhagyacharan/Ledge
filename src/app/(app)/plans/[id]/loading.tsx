/**
 * A plan's page while it loads (docs/plans designs 8j, 8k): the title, the progress bar and phase
 * cards of task rows at their real sizes, so nothing jumps when the page arrives.
 */
export default function Loading() {
  return (
    <div role="status" aria-label="Loading plan" className="dash mx-auto max-w-[880px]">
      <div aria-hidden>
        <div className="dash-skeleton mb-2 h-4 w-16" />
        <div className="dash-skeleton h-8 w-64 md:h-10 md:w-96" />
        <div className="dash-skeleton mt-5 h-2 w-full rounded-full" />
        <div className="dash-skeleton mt-2.5 mb-5 h-3 w-60" />
        {[3, 2].map((rows, i) => (
          <div
            key={i}
            className="mb-3 rounded-2xl border border-dash-edge bg-dash-card px-4 pt-3.5 pb-2 shadow-(--dash-card-shadow) md:mb-4 md:px-5"
          >
            <div className="dash-skeleton mb-2 h-4 w-40" />
            {Array.from({ length: rows }, (_, r) => (
              <div key={r} className="flex items-center gap-3 py-3">
                <div className="dash-skeleton size-5 shrink-0 rounded-full" />
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <div className="dash-skeleton h-3.5" style={{ width: `${70 - r * 12}%` }} />
                  <div className="dash-skeleton h-3 w-24" />
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}
