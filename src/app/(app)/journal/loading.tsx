/** Placeholder while a journal day loads: the same shapes, so nothing jumps (CLAUDE.md §8). */
export default function JournalLoading() {
  return (
    <div className="dash mx-auto w-full max-w-4xl pb-24" aria-busy="true">
      <p className="sr-only" role="status">
        Loading the journal
      </p>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between md:mb-8">
        <div className="h-9 w-36 dash-skeleton rounded-xl" />
        <div className="h-[52px] w-full dash-skeleton rounded-full sm:w-72 md:h-11" />
      </div>
      <div className="mb-2 h-8" />
      <div className="grid gap-2 md:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-16 dash-skeleton rounded-2xl bg-dash-well md:h-28" />
        ))}
      </div>
      <div className="mt-5 h-11 w-64 dash-skeleton rounded-full" />
      <div className="mt-5 h-64 dash-skeleton rounded-2xl bg-dash-well md:h-80" />
    </div>
  );
}
