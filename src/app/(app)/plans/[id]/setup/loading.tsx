/** Placeholder while a draft's current step loads (screens 8d to 8e) at their real sizes. */
export default function PlanSetupLoading() {
  return (
    <div className="dash mx-auto flex w-full max-w-xl flex-col gap-3.5" aria-busy="true">
      <p className="sr-only" role="status">
        Loading your plan
      </p>
      <div aria-hidden className="flex flex-col gap-3.5">
        <div className="dash-skeleton h-1 w-full rounded-full" />
        <div className="flex items-center justify-between">
          <div className="dash-skeleton size-11 rounded-full" />
          <div className="dash-skeleton h-3 w-24" />
          <div className="w-11" />
        </div>
        <div className="dash-skeleton mt-3 h-9 w-3/4" />
        <div className="dash-skeleton h-4 w-1/2" />
        <div className="mt-2 flex flex-col gap-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="dash-skeleton h-14 w-full rounded-[14px]" />
          ))}
        </div>
        <div className="mt-6 flex gap-2">
          <div className="dash-skeleton h-12 w-28 rounded-full" />
          <div className="dash-skeleton h-12 flex-1 rounded-full" />
        </div>
      </div>
    </div>
  );
}
