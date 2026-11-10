"use client";

import { List as ListIcon, Plus } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { ListFormDialog } from "./list-form-dialog";
import { useTodos } from "./todos-provider";

/** The "Lists" group in the sidebar, with a button to create a list. */
export function TodoSidebarSection() {
  const { lists } = useTodos();
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();
  const [creating, setCreating] = useState(false);
  const own = lists.filter((l) => !l.isInbox);

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Lists</SidebarGroupLabel>
      <SidebarGroupAction
        title="New list"
        aria-label="New list"
        onClick={() => setCreating(true)}
        className="size-11 md:size-5"
      >
        <Plus />
      </SidebarGroupAction>
      <SidebarGroupContent>
        <SidebarMenu>
          {own.map((list) => {
            const href = `/lists/${list.id}`;
            const active = pathname === href;
            return (
              <SidebarMenuItem key={list.id}>
                <SidebarMenuButton
                  asChild
                  isActive={active}
                  className="h-11 md:h-8"
                  onClick={() => isMobile && setOpenMobile(false)}
                >
                  <Link href={href} aria-current={active ? "page" : undefined}>
                    {list.icon ? <span aria-hidden>{list.icon}</span> : <ListIcon />}
                    <span>{list.name}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
          {own.length === 0 ? (
            <li className="px-2 py-1 text-xs text-muted-foreground">No lists yet.</li>
          ) : null}
        </SidebarMenu>
      </SidebarGroupContent>
      <ListFormDialog open={creating} onOpenChange={setCreating} />
    </SidebarGroup>
  );
}
