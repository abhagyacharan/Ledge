/**
 * The round "+" button (docs/new_design.md §3). One look and one place for the whole app: Log a
 * transaction on Expense Tracker pages, Add a task everywhere else. On a phone it is 56px and sits
 * beside the 64px tab bar, on the same line (centred on it); with a mouse it floats bottom right.
 */
export const FAB_CLASS =
  "fixed right-4 bottom-[calc(var(--tabbar-gap)+0.25rem)] z-30 grid size-14 place-items-center rounded-full bg-foreground text-background shadow-[0_10px_30px_-10px_rgb(0_0_0/0.45)] outline-none transition-transform duration-150 ease-snap focus-visible:ring-4 focus-visible:ring-ring/50 active:scale-95 md:right-6 md:bottom-6 md:size-13";

/** The plus inside it; turns into a cross while its menu is open. */
export const FAB_ICON_CLASS = "size-6 transition-transform duration-200 ease-snap";
