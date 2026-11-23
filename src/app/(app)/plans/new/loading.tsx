/** Placeholder for step 1 (screen 8c) at its real sizes. */
export default function NewPlanLoading() {
  return (
    <div className="dash mx-auto flex w-full max-w-xl flex-col gap-3.5" aria-busy="true">
      <p className="sr-only" role="status">
        Loading
      </p>
      <div aria-hidden className="flex flex-col gap-3.5">
        <div className="dash-skeleton h-1 w-full rounded-full" />
        <div className="flex items-center justify-between">
          <div className="dash-skeleton size-11 rounded-full" />
          <div className="dash-skeleton h-3 w-20" />
          <div className="w-11" />
        </div>
        <div className="dash-skeleton mt-3 h-3 w-48" />
        <div className="dash-skeleton h-[200px] w-full rounded-2xl" />
        <div className="flex gap-2">
          <div className="dash-skeleton h-11 w-40 rounded-full" />
          <div className="dash-skeleton h-11 w-40 rounded-full" />
        </div>
        <div className="dash-skeleton mt-6 h-12 w-full rounded-full" />
      </div>
    </div>
  );
}
