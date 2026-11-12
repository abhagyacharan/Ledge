"use client";

import { ChevronRight, Search, Settings, Trash2 } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader } from "@/components/ui/sidebar";
import { enabledModules, isCurrent, type AppModule } from "@/config/modules";
import { cn } from "@/lib/utils";
import { Brand } from "./brand";
import { NavRow } from "./nav-row";
import { SignOutButton } from "./sign-out-button";
import { ThemeToggle } from "./theme-toggle";

/**
 * The desktop sidebar (docs/design.md §5e): the two main parts of the app, Expense Tracker and
 * Tasks, as equal sections. Each one opens to show its views; Tasks also shows your lists. The
 * shared places (Search, Trash, Settings) and your account sit at the bottom. Phones use the
 * bottom tab bar instead (MobileTabBar).
 */
export function AppSidebar({ user }: { user: { name: string; email: string } }) {
  const pathname = usePathname();

  return (
    <Sidebar className="border-r border-sidebar-border">
      <SidebarHeader className="px-4 pt-5 pb-3">
        <Brand />
      </SidebarHeader>
      <SidebarContent className="gap-1 px-2.5">
        {enabledModules().map((m) => (
          <ModuleSection key={m.id} module={m} pathname={pathname} />
        ))}
      </SidebarContent>
      <SidebarFooter className="gap-1 px-2.5 pb-4">
        <NavRow href="/search" label="Search" icon={Search} current={pathname === "/search"} />
        <NavRow href="/trash" label="Trash" icon={Trash2} current={pathname === "/trash"} />
        <NavRow
          href="/settings"
          label="Settings"
          icon={Settings}
          current={pathname === "/settings"}
        />
        <div className="mt-3 flex items-center gap-2.5 border-t border-sidebar-border px-1 pt-3">
          <span
            aria-hidden
            className="grid size-8 shrink-0 place-items-center rounded-full bg-foreground text-xs font-semibold text-background"
          >
            {user.name.trim().charAt(0).toUpperCase() || "?"}
          </span>
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

function ModuleSection({ module: m, pathname }: { module: AppModule; pathname: string }) {
  const inside = m.owns(pathname);
  // A module with no views of its own (Journal) is one plain link.
  if (m.nav.length === 0) {
    return (
      <div className="py-1">
        <NavRow href={m.route} label={m.label} icon={m.icon} strong current={inside} />
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
