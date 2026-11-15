import type { ReactNode } from "react";

/** The Settings card (docs/new_design.md screen 5f), shared by server and client parts. */
export const card =
  "scroll-mt-6 rounded-2xl border border-dash-edge bg-dash-card px-4 py-1 text-dash-ink shadow-(--dash-card-shadow) md:rounded-3xl md:px-5";

export function CardTitle({ id, children }: { id: string; children: ReactNode }) {
  return (
    <h2 id={id} className="pt-3 pb-1 text-[15px] font-semibold">
      {children}
    </h2>
  );
}
