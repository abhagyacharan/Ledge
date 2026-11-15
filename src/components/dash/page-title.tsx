import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * The top of a page in the new design (docs/new_design.md §2 and screens 2b, 2c, 3b): an optional
 * "‹ Back" link (phones only unless `backAlways`, since the sidebar does that job with a mouse),
 * the title in Bricolage, an optional mono line under it and an action on the right.
 */
export function PageTitle({
  title,
  back,
  backAlways = false,
  meta,
  action,
  leading,
  className,
}: {
  title: ReactNode;
  back?: { href: string; label: string };
  backAlways?: boolean;
  /** One mono line under the title: "Fri 13 Nov · 3 today · 4 done this week". */
  meta?: ReactNode;
  action?: ReactNode;
  /** Something before the title, such as a list's icon. */
  leading?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("mb-5 flex flex-col md:mb-6", className)}>
      {back ? (
        <Link
          href={back.href}
          className={cn(
            "-ml-2 inline-flex h-11 w-fit items-center gap-1 rounded-full pr-3 pl-1.5 text-[13px] font-medium text-dash-ink-soft outline-none transition-colors duration-150 hover:text-dash-ink focus-visible:ring-3 focus-visible:ring-ring/50",
            !backAlways && "md:hidden",
          )}
        >
          <ChevronLeft aria-hidden className="size-4" />
          {back.label}
        </Link>
      ) : null}
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          {leading}
          <div className="min-w-0">
            <h1 className="font-display text-[32px] leading-[1.1] font-semibold tracking-[-0.015em] break-words text-dash-ink md:text-[40px] md:tracking-[-0.02em]">
              {title}
            </h1>
            {meta ? (
              <p className="mt-1.5 font-mono text-xs font-medium text-dash-ink-soft">{meta}</p>
            ) : null}
          </div>
        </div>
        {action ? <div className="flex shrink-0 items-center gap-2 pt-1">{action}</div> : null}
      </div>
    </header>
  );
}

/**
 * A card that holds one group of rows (docs/new_design.md §4 "Card"): a small heading line with
 * an optional count or action on the right, then the rows. 16px corners, separate from its
 * neighbours, as in the Today and Upcoming screens.
 */
export function SectionCard({
  id,
  heading,
  aside,
  tone,
  className,
  children,
}: {
  id: string;
  heading: ReactNode;
  aside?: ReactNode;
  tone?: "bad";
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      aria-labelledby={id}
      className={cn(
        "min-w-0 rounded-2xl border border-dash-edge bg-dash-card px-4 pt-3.5 pb-2 text-dash-ink shadow-(--dash-card-shadow) md:px-5",
        className,
      )}
    >
      <div className="mb-1 flex min-h-6 items-center justify-between gap-3">
        <h2
          id={id}
          className={cn(
            "inline-flex items-center gap-1.5 text-[13px] font-semibold",
            tone === "bad" ? "text-dash-bad" : "text-dash-ink",
          )}
        >
          {heading}
        </h2>
        {aside}
      </div>
      {children}
    </section>
  );
}
