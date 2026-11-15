"use client";

import { House, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { enabledModules } from "@/config/modules";
import { cn } from "@/lib/utils";

/** At most three modules are pinned to the bar beside Home (docs/new_design.md §3). */
const MAX_PINS = 3;

/**
 * Phone navigation (docs/new_design.md §3, `LedgeTabBar`): a floating 64px pill with Home and the
 * pinned modules, each an icon and a short label. The round + button sits to its right on the same
 * line (FAB_CLASS). There is no More or Search tab: Search, Trash and Settings are tiles on Home.
 * Hidden from tablet width up, where the sidebar takes over.
 */
export function MobileTabBar() {
  const pathname = usePathname();
  const pins = enabledModules().slice(0, MAX_PINS);
  const tabs: { id: string; href: string; label: string; icon: LucideIcon; current: boolean }[] = [
    { id: "home", href: "/", label: "Home", icon: House, current: pathname === "/" },
    ...pins.map((m) => ({
      id: m.id,
      href: m.route,
      label: m.shortLabel ?? m.label,
      icon: m.icon,
      current: m.owns(pathname),
    })),
  ];

  return (
    <nav
      aria-label="Main"
      // 16px from the left edge (the page gutter); the right edge stops 8px short of the 56px +
      // button, which is centred on the bar's height.
      className="fixed bottom-(--tabbar-gap) left-4 right-[5.5rem] z-30 h-16 rounded-full border border-dash-edge bg-card p-1.5 shadow-[0_12px_32px_-12px_rgb(16_24_16/0.28),0_2px_6px_-2px_rgb(16_24_16/0.08)] md:hidden dark:shadow-[0_14px_36px_-12px_rgb(0_0_0/0.7)]"
    >
      <ul
        className="grid h-full gap-0.5"
        style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
      >
        {tabs.map((tab) => (
          <li key={tab.id}>
            <Link
              href={tab.href}
              aria-current={tab.current ? "page" : undefined}
              className={cn(
                // A pill inside the pill: concentric with the bar, over the 44px tap minimum. The
                // current tab is filled and its label turns ink and semibold, never colour alone.
                "flex h-full w-full flex-col items-center justify-center gap-1 rounded-full text-[11px] leading-none outline-none transition-[background-color,color,transform] duration-150 ease-snap focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset active:scale-[0.96]",
                tab.current
                  ? "bg-dash-well font-semibold text-foreground"
                  : "font-medium text-muted-foreground",
              )}
            >
              <tab.icon aria-hidden className="size-[18px]" strokeWidth={1.85} />
              {tab.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
