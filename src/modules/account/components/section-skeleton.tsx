import { GroupLabel, settingsCard } from "./ui";
import { SectionHeader } from "./ui";

/**
 * A section's loading state (screen 9o): the title and group labels are real text, only the rows
 * are well-coloured bars at their real heights, so nothing moves when the content arrives.
 */
export function SectionSkeleton({
  title,
  groups,
}: {
  title: string;
  /** Each group: its label (or null) and how many rows, and how tall they are. */
  groups: { label: string | null; rows: number; tall?: boolean }[];
}) {
  return (
    <div aria-busy="true" className="flex flex-col gap-3">
      <SectionHeader title={title} />
      {groups.map((g, i) => (
        <div key={i} className="flex flex-col gap-3">
          {g.label ? <GroupLabel>{g.label}</GroupLabel> : null}
          <div className={settingsCard}>
            {Array.from({ length: g.rows }, (_, r) => (
              <div
                key={r}
                className={`flex items-center gap-3 border-t border-dash-edge px-4 first:border-t-0 ${g.tall ? "min-h-[88px]" : "min-h-16"}`}
              >
                <span className="size-9 shrink-0 animate-pulse rounded-full bg-dash-well" />
                <span className="flex flex-1 flex-col gap-2">
                  <span className="h-3.5 w-2/5 animate-pulse rounded-full bg-dash-well" />
                  <span className="h-3 w-3/5 animate-pulse rounded-full bg-dash-well" />
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
      <span className="sr-only">Loading…</span>
    </div>
  );
}
