import { Check, ChevronLeft, CircleAlert } from "lucide-react";
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { initials, shownAvatar } from "../avatar";

/**
 * The pieces every Settings section is built from (docs/settings-design-prompt.md, screens 9a to
 * 9p): white cards of 14px rows, small group labels, switches with a written On or Off, choice
 * rows with an ink tick, pills, and the "Saved" mark that fades after 2 seconds.
 */

export const settingsCard =
  "overflow-hidden rounded-2xl border border-dash-edge bg-dash-card text-dash-ink shadow-(--dash-card-shadow)";

/** A row inside a card: 56px at least, a line between rows. */
export const rowClass =
  "flex min-h-14 w-full items-center gap-3 border-t border-dash-edge px-4 py-2.5 text-left text-[15px] font-medium first:border-t-0";

export function SettingsCard({ children, className, ...props }: ComponentProps<"div">) {
  return (
    <div className={cn(settingsCard, className)} {...props}>
      {children}
    </div>
  );
}

export function GroupLabel({ children, id }: { children: ReactNode; id?: string }) {
  return (
    <h2 id={id} className="px-1 pt-3 pb-0.5 text-[12px] font-medium text-dash-ink-soft">
      {children}
    </h2>
  );
}

/** The icon well at the start of a row. */
export function RowIcon({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid size-8 shrink-0 place-items-center rounded-full bg-dash-well text-dash-ink [&_svg]:size-4",
        className,
      )}
    >
      {children}
    </span>
  );
}

/** The secondary line under a row's name. */
export function Sub({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn("block text-[13px] leading-snug font-normal text-dash-ink-soft", className)}
    >
      {children}
    </span>
  );
}

const pillBase =
  "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full font-semibold outline-none transition-colors duration-150 focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed aria-disabled:cursor-not-allowed [&_svg]:size-4";

/** Pills: `primary` ink, `secondary` card with an edge, `small` the row action, `danger` red. */
export const pill = {
  primary: cn(
    pillBase,
    "h-12 bg-dash-ink px-5 text-[15px] text-dash-card hover:bg-dash-ink/90 disabled:bg-dash-track disabled:text-dash-ink-soft",
  ),
  secondary: cn(
    pillBase,
    "h-11 border border-dash-edge bg-dash-card px-4 text-[14px] text-dash-ink hover:bg-dash-well disabled:opacity-50",
  ),
  small: cn(
    pillBase,
    "h-11 border border-dash-edge bg-dash-card px-3.5 text-[13px] text-dash-ink hover:bg-dash-well disabled:opacity-50 md:h-9",
  ),
  dangerText: cn(
    pillBase,
    "h-11 px-2 text-[13px] text-dash-bad hover:bg-dash-bad-bg disabled:opacity-50 md:h-9",
  ),
  danger: cn(
    pillBase,
    "h-12 bg-dash-bad px-5 text-[15px] text-white hover:bg-dash-bad/90 disabled:bg-dash-track disabled:text-dash-ink-soft dark:text-dash-card",
  ),
};

/** A failure written out in red with an icon, and an optional Try again. */
export function ErrorLine({
  children,
  onRetry,
  className,
}: {
  children: ReactNode;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <span
      role="alert"
      className={cn("flex items-start gap-1.5 text-[13px] font-medium text-dash-bad", className)}
    >
      <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
      <span className="flex-1">{children}</span>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="min-h-8 rounded-md px-1 font-semibold text-dash-ink underline underline-offset-4 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          Try again
        </button>
      ) : null}
    </span>
  );
}

/** A 48×28 switch with its state written beside it (never colour alone). */
export function Switch({
  on,
  onChange,
  labelledBy,
  describedBy,
  disabled = false,
}: {
  on: boolean;
  onChange: (next: boolean) => void;
  labelledBy: string;
  describedBy?: string;
  disabled?: boolean;
}) {
  return (
    <span className="flex shrink-0 items-center gap-2.5">
      <span aria-hidden className="text-[13px] font-medium text-dash-ink-soft">
        {on ? "On" : "Off"}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        aria-disabled={disabled || undefined}
        onClick={() => (disabled ? undefined : onChange(!on))}
        className={cn(
          "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full p-0.5 outline-none transition-colors duration-150 focus-visible:ring-3 focus-visible:ring-ring/50",
          on ? "bg-dash-ink" : "bg-dash-track",
          disabled && "cursor-not-allowed opacity-50",
        )}
      >
        <span
          aria-hidden
          className={cn(
            "size-6 rounded-full bg-dash-card shadow-(--dash-lift) transition-transform duration-150 ease-snap",
            on && "translate-x-5",
          )}
        />
      </button>
    </span>
  );
}

/** The filled ink circle with a tick (chosen) or the empty ring (not chosen). */
export function Tick({ on, className }: { on: boolean; className?: string }) {
  return on ? (
    <span
      aria-hidden
      className={cn(
        "grid size-6 shrink-0 place-items-center rounded-full bg-dash-ink text-dash-card",
        className,
      )}
    >
      <Check className="size-3.5" strokeWidth={3} />
    </span>
  ) : (
    <span
      aria-hidden
      className={cn("size-6 shrink-0 rounded-full border-[1.5px] border-dash-track", className)}
    />
  );
}

/** One row of a single-choice group: the tick, the label, an optional line under it. */
export function ChoiceRow({
  checked,
  onSelect,
  children,
  sub,
  trailing,
  disabled,
}: {
  checked: boolean;
  onSelect: () => void;
  children: ReactNode;
  sub?: ReactNode;
  trailing?: ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        rowClass,
        "outline-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset disabled:cursor-default disabled:opacity-60",
        checked ? "font-semibold" : "font-medium",
      )}
    >
      <Tick on={checked} />
      <span className="min-w-0 flex-1">
        <span className="block">{children}</span>
        {sub ? <Sub>{sub}</Sub> : null}
      </span>
      {trailing}
    </button>
  );
}

/**
 * The top of a section: on a phone "‹ Settings" above a 32px title (each section is its own
 * screen there); with a mouse the 44px title alone, since the settings column is beside it.
 */
export function SectionHeader({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <header className="mb-2 flex flex-col">
      <Link
        href="/settings"
        className="-ml-2 inline-flex h-11 w-fit items-center gap-0.5 rounded-full pr-3 pl-1 text-[15px] font-medium text-dash-ink outline-none focus-visible:ring-3 focus-visible:ring-ring/50 md:hidden"
      >
        <ChevronLeft aria-hidden className="size-5" />
        Settings
      </Link>
      <h1 className="font-display text-[32px] leading-[1.1] font-semibold tracking-[-0.01em] text-dash-ink md:text-[44px] md:leading-[1.05] md:tracking-[-0.02em]">
        {title}
      </h1>
      {children}
    </header>
  );
}

/** The profile photo, or initials on the well colour when there is none. */
export function Avatar({
  image,
  name,
  className,
}: {
  image: string | null | undefined;
  name: string;
  className?: string;
}) {
  const src = shownAvatar(image);
  return (
    <span
      aria-hidden
      className={cn(
        "relative grid shrink-0 place-items-center overflow-hidden rounded-full bg-dash-well font-semibold text-dash-ink",
        className,
      )}
    >
      {src ? (
        // A tiny same-site photo; next/image would add nothing here.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="size-full object-cover" />
      ) : (
        initials(name)
      )}
    </span>
  );
}

/** Calm, never red: the Google-only notice and similar (screen 9l). */
export function Notice({ children, icon }: { children: ReactNode; icon: ReactNode }) {
  return (
    <div
      role="note"
      className="flex gap-3 rounded-2xl bg-dash-well px-4 py-3.5 text-[14px] leading-relaxed text-dash-ink [&>svg]:mt-1 [&>svg]:size-4 [&>svg]:shrink-0"
    >
      {icon}
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
