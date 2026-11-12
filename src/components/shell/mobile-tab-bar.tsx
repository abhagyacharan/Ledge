"use client";

import { Menu, Search, Settings, Trash2 } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Sheet, SheetBody, SheetHeader } from "@/components/dash/sheet";
import { enabledModules } from "@/config/modules";
import { cn } from "@/lib/utils";
import { NavRow } from "./nav-row";
import { SignOutButton } from "./sign-out-button";
import { ThemeToggle } from "./theme-toggle";

/**
 * Phone navigation (docs/design.md §5e): a bottom tab bar with the main parts of the app, Search
 * and "More", which opens a sheet with Trash, Settings and your account. Your lists are in the
 * Lists menu at the top of the Tasks pages. Hidden from tablet width up, where the sidebar takes
 * over (and the headers' round Search button returns).
 */
export function MobileTabBar({ user }: { user: { name: string; email: string } }) {
  const pathname = usePathname();
  const [more, setMore] = useState(false);
  const inSearch = pathname === "/search";
  const tabs = enabledModules();
  const inModule = inSearch || tabs.some((m) => m.owns(pathname));
  const close = () => setMore(false);
  // One column per module, then Search and More.
  const columns = tabs.length === 3 ? "grid-cols-5" : "grid-cols-4";

  return (
    <>
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background pb-[env(safe-area-inset-bottom,0px)] md:hidden"
      >
        <ul className={cn("mx-auto grid h-16 max-w-md", columns)}>
          {tabs.map((m) => (
            <li key={m.id}>
              <Tab
                href={m.route}
                label={m.shortLabel ?? m.label}
                current={!more && m.owns(pathname)}
              >
                <m.icon aria-hidden className="size-5" strokeWidth={1.85} />
              </Tab>
            </li>
          ))}
          <li>
            <Tab href="/search" label="Search" current={!more && inSearch}>
              <Search aria-hidden className="size-5" strokeWidth={1.85} />
            </Tab>
          </li>
          <li>
            <button
              type="button"
              aria-haspopup="dialog"
              aria-expanded={more}
              onClick={() => setMore(true)}
              className={tabClass(!inModule || more)}
            >
              <TabIcon current={!inModule || more}>
                <Menu aria-hidden className="size-5" strokeWidth={1.85} />
              </TabIcon>
              More
            </button>
          </li>
        </ul>
      </nav>

      <Sheet open={more} onOpenChange={setMore}>
        <SheetHeader title="More" />
        <SheetBody>
          <div className="flex flex-col gap-1">
            <NavRow
              href="/trash"
              label="Trash"
              icon={Trash2}
              current={pathname === "/trash"}
              onNavigate={close}
            />
            <NavRow
              href="/settings"
              label="Settings"
              icon={Settings}
              current={pathname === "/settings"}
              onNavigate={close}
            />
          </div>
          <div className="mt-5 flex items-center gap-3 border-t border-border pt-4">
            <span
              aria-hidden
              className="grid size-9 shrink-0 place-items-center rounded-full bg-foreground text-sm font-semibold text-background"
            >
              {user.name.trim().charAt(0).toUpperCase() || "?"}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{user.name}</p>
              <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            </div>
            <ThemeToggle />
          </div>
          <div className="mt-2">
            <SignOutButton />
          </div>
        </SheetBody>
      </Sheet>
    </>
  );
}

const tabClass = (current: boolean) =>
  cn(
    "flex h-full w-full flex-col items-center justify-center gap-1 text-[11px] font-medium outline-none transition-colors duration-150 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset",
    current ? "text-foreground" : "text-muted-foreground",
  );

function TabIcon({ current, children }: { current: boolean; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "grid h-7 w-14 place-items-center rounded-full transition-colors duration-150",
        current && "bg-card shadow-(--dash-lift)",
      )}
    >
      {children}
    </span>
  );
}

function Tab({
  href,
  label,
  current,
  children,
}: {
  href: string;
  label: string;
  current: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} aria-current={current ? "page" : undefined} className={tabClass(current)}>
      <TabIcon current={current}>{children}</TabIcon>
      {label}
    </Link>
  );
}
