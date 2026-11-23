"use client";

import { ChevronRight, House, Lock, Search, Settings, Trash2 } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader } from "@/components/ui/sidebar";
import { enabledModules, isCurrent, type AppModule } from "@/config/modules";
import { cn } from "@/lib/utils";
import { Avatar } from "@/modules/account/components/ui";
import { OPEN_PALETTE_EVENT } from "@/modules/todos/components/shortcuts";
import { Brand } from "./brand";
import { NavRow } from "./nav-row";
import { SignOutButton } from "./sign-out-button";
import { ThemeToggle } from "./theme-toggle";

/**
 * The desktop sidebar (docs/new_design.md §3, `LedgeSidebar`): the brand, Home, a "Modules" label,
 * then each module from the registry. A module with views opens to show them; Tasks also shows
 * your lists. Search (Ctrl K), Trash, Settings and your account sit at the bottom. Phones use the
 * bottom tab bar instead (MobileTabBar).
 */
export function AppSidebar({
  user,
  journalLocked = false,
  activePlans = 0,
}: {
  user: { name: string; email: string; image: string | null };
  /** The Journal row shows a lock icon while the journal is locked (screen 7h). */
  journalLocked?: boolean;
  /** How many plans are active: shown beside Plans. */
  activePlans?: number;
}) {
  const pathname = usePathname();

  return (
    <Sidebar className="border-r border-sidebar-border">
      <SidebarHeader className="px-4 pt-5 pb-3">
        <Brand />
      </SidebarHeader>
      <SidebarContent className="gap-1 px-2.5">
        <div className="py-1">
          <NavRow href="/" label="Home" icon={House} strong current={pathname === "/"} />
        </div>
        <p className="px-2.5 pt-3 pb-1 font-mono text-[11px] font-medium text-muted-foreground">
          Modules
        </p>
        {enabledModules().map((m) => (
          <ModuleSection
            key={m.id}
            module={m}
            pathname={pathname}
            locked={m.id === "journal" && journalLocked}
            count={m.id === "plans" ? activePlans : 0}
          />
        ))}
      </SidebarContent>
      <SidebarFooter className="gap-1 px-2.5 pb-4">
        <NavRow
          href="/search"
          label="Search"
          icon={Search}
          current={pathname === "/search"}
          // The same palette as Ctrl K: jump anywhere, or press Enter to search everything.
          onPress={() => window.dispatchEvent(new Event(OPEN_PALETTE_EVENT))}
          trailing={
            <kbd aria-hidden className="font-mono text-[11px] font-medium text-muted-foreground">
              Ctrl K
            </kbd>
          }
        />
        <NavRow href="/trash" label="Trash" icon={Trash2} current={pathname === "/trash"} />
        <NavRow
          href="/settings"
          label="Settings"
          icon={Settings}
          current={pathname === "/settings" || pathname.startsWith("/settings/")}
        />
        <div className="mt-3 flex items-center gap-2.5 border-t border-sidebar-border px-1 pt-3">
          {/* The profile photo, or initials (Settings › Account). */}
          <Avatar image={user.image} name={user.name} className="size-8 text-xs" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{user.name}</p>
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          </div>
          <ThemeToggle />
        </div>
        <SignOutButton />
      </SidebarFooter>
    </Sidebar>
  );
}

function ModuleSection({
  module: m,
  pathname,
  locked = false,
  count = 0,
}: {
  module: AppModule;
  pathname: string;
  locked?: boolean;
  /** A count shown at the end of the row (active plans). */
  count?: number;
}) {
  const inside = m.owns(pathname);
  // A module with no views of its own (Journal) is one plain link.
  if (m.nav.length === 0) {
    return (
      <div className="py-1">
        <NavRow
          href={m.route}
          label={m.label}
          icon={m.icon}
          strong
          current={inside}
          badge={m.beta ? "Beta" : undefined}
          trailing={
            locked ? (
              <>
                <Lock aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />
                <span className="sr-only">(locked)</span>
              </>
            ) : count > 0 ? (
              <span className="font-mono text-xs font-medium text-muted-foreground">
                {count}
                <span className="sr-only"> active</span>
              </span>
            ) : null
          }
        />
      </div>
    );
  }
  return <CollapsibleSection module={m} pathname={pathname} inside={inside} />;
}

/**
 * A module with views: the whole header row is one button that shows or hides them (the views
 * themselves are the links). Opens by itself when you arrive on one of its pages.
 */
function CollapsibleSection({
  module: m,
  pathname,
  inside,
}: {
  module: AppModule;
  pathname: string;
  inside: boolean;
}) {
  // Open where you are; the other section stays tidy until you open it.
  const [open, setOpen] = useState(inside);
  const [seenInside, setSeenInside] = useState(inside);
  if (inside !== seenInside) {
    setSeenInside(inside);
    if (inside) setOpen(true);
  }
  const panelId = `nav-${m.id}`;

  return (
    <div className="py-1">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex h-11 w-full min-w-0 items-center gap-2.5 rounded-xl px-2.5 text-left text-sm font-medium outline-none transition-[background-color,color,box-shadow] duration-150 focus-visible:ring-3 focus-visible:ring-ring/50 md:h-9",
          // Closed while you are inside it: the header carries the "you are here" mark instead.
          inside && !open
            ? "bg-card text-foreground shadow-(--dash-lift)"
            : "text-foreground hover:bg-sidebar-accent",
        )}
      >
        <m.icon aria-hidden className="size-4 shrink-0" strokeWidth={1.85} />
        <span className="min-w-0 flex-1 truncate">{m.label}</span>
        <ChevronRight
          aria-hidden
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform duration-200 ease-snap",
            open && "rotate-90",
          )}
        />
      </button>
      {open ? (
        <div
          id={panelId}
          className="mt-1 ml-3 flex flex-col gap-1 border-l border-sidebar-border pl-2"
        >
          {m.nav.map((item) => (
            <NavRow
              key={item.route}
              href={item.route}
              label={item.label}
              icon={item.icon}
              current={isCurrent(item.route, pathname, m.route)}
            />
          ))}
          {m.SidebarSection ? <m.SidebarSection /> : null}
        </div>
      ) : null}
    </div>
  );
}
