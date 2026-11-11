import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * The white card of the dashboard look (docs/design.md): a large radius, a very soft edge and
 * generous padding. Must sit inside an element with the `dash` class, which defines its colours.
 */
export function DashCard({
  id,
  title,
  subtitle,
  action,
  hideTitle = false,
  className,
  children,
}: {
  /** Unique on the page: names the section for screen readers. */
  id: string;
  title: string;
  subtitle?: string;
  /** Right-hand side of the header (a legend, a button). */
  action?: ReactNode;
  /** Keep the heading for screen readers only (a card that is just tiles). */
  hideTitle?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      aria-labelledby={`${id}-title`}
      className={cn(
        "min-w-0 rounded-2xl border border-dash-edge bg-dash-card px-4 py-5 sm:p-5 md:rounded-3xl text-dash-ink md:p-6",
        className,
      )}
    >
      <header
        className={cn(
          "mb-4 flex flex-wrap items-start justify-between gap-3",
          hideTitle && "sr-only",
        )}
      >
        <div>
          <h3 id={`${id}-title`} className="text-base font-semibold">
            {title}
          </h3>
          {subtitle ? <p className="text-[13px] text-dash-ink-soft">{subtitle}</p> : null}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}
