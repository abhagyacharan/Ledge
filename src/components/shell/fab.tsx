import { cn } from "@/lib/utils";

/**
 * The round "+" button (docs/new_design.md §3). One look and one place for the whole app: Log a
 * transaction on Expense Tracker pages, Add a task everywhere else. On a phone it is 56px and sits
 * beside the 64px tab bar, on the same line (centred on it); with a mouse it floats bottom right.
 * On a phone it matches the tab bar beside it (the card surface, its edge and shadow, an ink
 * plus; O, 2026-11-15). From tablet width up it is filled with the orange.
 */
export const FAB_CLASS =
  "[-webkit-touch-callout:none] select-none fixed right-4 bottom-[calc(var(--tabbar-gap)+0.25rem)] z-30 grid size-14 place-items-center rounded-full border border-dash-edge bg-card text-foreground shadow-[0_12px_32px_-12px_rgb(16_24_16/0.28),0_2px_6px_-2px_rgb(16_24_16/0.08)] outline-none transition-transform duration-150 ease-snap focus-visible:ring-4 focus-visible:ring-ring/50 active:scale-95 dark:shadow-[0_14px_36px_-12px_rgb(0_0_0/0.7)] md:right-6 md:bottom-6 md:size-13 md:border-0 md:bg-dash-accent md:text-dash-on-accent md:shadow-[0_10px_28px_-10px_rgb(204_66_11/0.7)] md:dark:shadow-[0_10px_28px_-10px_rgb(204_66_11/0.7)]";

/** The plus inside it; turns into a cross while its menu is open. */
export const FAB_ICON_CLASS = "size-6 transition-transform duration-200 ease-snap";

/**
 * A small note with an arrow pointing at the + from tablet width up: "Hold for voice". Shown only
 * when voice capture is on, so newcomers learn the hold (O, 2026-11-22). Decorative: the button's
 * own label already says "hold to speak", and clicks pass through it.
 */
export function FabVoiceHint({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none fixed right-[72px] bottom-[56px] z-20 hidden select-none flex-col items-end text-dash-ink-soft md:flex",
        className,
      )}
    >
      <span className="rounded-full bg-background/80 px-2 py-0.5 text-[18px] font-medium whitespace-nowrap backdrop-blur-sm">Hold for voice</span>
      <svg
        viewBox="0 0 40 28"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="mr-[-4px] h-[42px] w-[60px]"
      >
        <path d="M4 3c3 12 12 19 28 20" />
        <path d="M27 18l5 5-6 3" />
      </svg>
    </div>
  );
}
