"use client";

import { Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { APP_NAME } from "@/config/app";
import { enabledModules, navItemsFor, type NavItem } from "@/config/modules";
import { SignOutButton } from "./sign-out-button";
import { ThemeToggle } from "./theme-toggle";

function NavLinks({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();
  return (
    <SidebarMenu>
      {items.map(({ label, route, icon: Icon }) => {
        const active = pathname === route || pathname.startsWith(`${route}/`);
        return (
          <SidebarMenuItem key={route}>
            <SidebarMenuButton
              asChild
              isActive={active}
              className="h-11 md:h-8"
              onClick={() => isMobile && setOpenMobile(false)}
            >
              <Link href={route} aria-current={active ? "page" : undefined}>
                <Icon />
                <span>{label}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
}

export function AppSidebar({ user }: { user: { name: string; email: string } }) {
  const primary = enabledModules("primary").flatMap(navItemsFor);
  const others = enabledModules("modules");

  return (
    <Sidebar>
      <SidebarHeader>
        <p className="px-2 py-1 text-base font-semibold tracking-tight">{APP_NAME}</p>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <NavLinks items={primary} />
          </SidebarGroupContent>
        </SidebarGroup>
        {/* Each module may add its own groups (the tasks module adds "Lists"). */}
        {enabledModules("primary").map((m) =>
          m.SidebarSection ? <m.SidebarSection key={m.id} /> : null,
        )}
        {others.length > 0 ? (
          <SidebarGroup>
            <SidebarGroupLabel>Modules</SidebarGroupLabel>
            <SidebarGroupContent>
              <NavLinks items={others.flatMap(navItemsFor)} />
            </SidebarGroupContent>
          </SidebarGroup>
        ) : null}
      </SidebarContent>
      <SidebarFooter>
        <NavLinks items={[{ label: "Settings", route: "/settings", icon: Settings }]} />
        <div className="flex items-center justify-between gap-2 px-2">
          <div className="min-w-0">
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
