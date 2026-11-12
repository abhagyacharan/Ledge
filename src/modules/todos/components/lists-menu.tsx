"use client";

import { Check, ChevronDown, Plus } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { DropdownMenu as Menu } from "radix-ui";
import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { listIcon } from "../list-icons";
import { ListFormDialog } from "./list-form-dialog";
import { useTodos } from "./todos-provider";

/**
 * Phones only (docs/design.md §5f): a "Lists" button at the top right of every Tasks page. It opens
 * a menu of your lists (General first) and "New list", over a blurred page. Wider screens have the
 * lists in the sidebar, so the button is hidden there.
 */
export function ListsMenu() {
  const { lists } = useTodos();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  // "New list" hands focus to its dialog, so the menu must not take it back when it closes.
  const handedOff = useRef(false);
  const current = lists.find((l) => pathname === `/lists/${l.id}`);

  return (
    <>
      <Menu.Root open={open} onOpenChange={setOpen}>
        <Menu.Trigger
          aria-label={current ? `Lists, now showing ${current.name}` : "Lists"}
          className="flex h-11 shrink-0 items-center gap-1.5 rounded-full bg-dash-track pr-3 pl-4 text-sm font-medium text-dash-ink shadow-[inset_0_0_0_1px_var(--dash-track-edge)] outline-none transition-colors duration-150 hover:bg-dash-raised focus-visible:ring-3 focus-visible:ring-ring/50 md:hidden"
        >
          Lists
          <ChevronDown
            aria-hidden
            className={cn(
              "size-4 text-dash-ink-soft transition-transform duration-200 ease-snap",
              open && "rotate-180",
            )}
          />
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Content
            align="end"
            sideOffset={8}
            collisionPadding={16}
            onCloseAutoFocus={(event) => {
              if (handedOff.current) event.preventDefault();
              handedOff.current = false;
            }}
            className="dash z-50 max-h-[min(28rem,var(--radix-dropdown-menu-content-available-height))] w-[min(18rem,calc(100vw-2rem))] origin-(--radix-dropdown-menu-content-transform-origin) overflow-y-auto rounded-2xl border border-dash-edge bg-dash-card p-2 text-dash-ink shadow-[0_24px_48px_-16px_rgb(0_0_0/0.35)] outline-none data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=closed]:duration-150 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=open]:duration-200"
          >
            <Menu.Label className="px-3 pt-2 pb-1.5 text-xs font-medium text-dash-ink-soft">
              Your lists
            </Menu.Label>
            {lists.map((list) => {
              const href = `/lists/${list.id}`;
              const here = pathname === href;
              const Icon = listIcon(list.icon);
              return (
                <Menu.Item key={list.id} asChild>
                  <Link
                    href={href}
                    aria-current={here ? "page" : undefined}
                    className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm outline-none select-none transition-colors duration-100 data-[highlighted]:bg-dash-well"
                  >
                    <Icon aria-hidden className="size-4 shrink-0 text-dash-ink-soft" />
                    <span className={cn("min-w-0 flex-1 truncate", here && "font-semibold")}>
                      {list.name}
                    </span>
                    {here ? <Check aria-hidden className="size-4 shrink-0" /> : null}
                  </Link>
                </Menu.Item>
              );
            })}
            <Menu.Separator className="mx-2 my-1.5 h-px bg-dash-edge" />
            <Menu.Item
              onSelect={() => {
                handedOff.current = true;
                setCreating(true);
              }}
              className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium outline-none select-none transition-colors duration-100 data-[highlighted]:bg-dash-well"
            >
              <Plus aria-hidden className="size-4 shrink-0" />
              New list
            </Menu.Item>
          </Menu.Content>
        </Menu.Portal>
      </Menu.Root>
      {/* Blur the page behind the open menu (O, 2026-11-12). Tapping it closes the menu. */}
      {open
        ? createPortal(
            <div
              aria-hidden
              className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm animate-in fade-in-0 duration-200 md:hidden"
            />,
            document.body,
          )
        : null}
      <ListFormDialog open={creating} onOpenChange={setCreating} />
    </>
  );
}
