/**
 * Placeholder while a journal day loads (docs/new_design.md screen 4e): the day bar, the facts
 * card, the mood bar and the page, at their real sizes so nothing jumps (CLAUDE.md §8).
 */
export default function JournalLoading() {
  return (
    <div className="dash mx-auto w-full max-w-[680px] pb-24" aria-busy="true">
      <p className="sr-only" role="status">
        Loading the journal
      </p>
      <div aria-hidden className="mb-4 flex items-center justify-between md:justify-start md:gap-2">
        <div className="dash-skeleton size-11 rounded-full" />
        <div className="dash-skeleton h-5 w-28 md:hidden" />
        <div className="dash-skeleton size-11 rounded-full" />
      </div>
      <div aria-hidden className="flex flex-col gap-4 md:gap-5">
        <div className="flex justify-between">
          <div className="dash-skeleton h-3 w-16" />
          <div className="dash-skeleton h-3 w-24" />
        </div>
        <div className="rounded-2xl border border-dash-edge bg-dash-card px-4 py-3 shadow-(--dash-card-shadow)">
          <div className="dash-skeleton h-3.5 w-32" />
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3 py-3">
              <div className="dash-skeleton size-[18px] rounded-full" />
              <div className="dash-skeleton h-3.5 flex-1" />
            </div>
          ))}
        </div>
        <div className="dash-skeleton h-12 rounded-full md:h-10 md:w-96" />
        <div className="dash-skeleton h-64 rounded-2xl md:h-80" />
      </div>
    </div>
  );
}
