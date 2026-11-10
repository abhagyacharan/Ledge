"use client";

import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { enabledModules, navItemsFor } from "@/config/modules";
import { authClient } from "@/lib/auth-client";
import { ListFormDialog } from "./list-form-dialog";
import { QUICK_ADD_EVENT } from "./quick-add-button";
import { OPEN_HELP_EVENT, OPEN_PALETTE_EVENT } from "./shortcuts";
import { useTodos } from "./todos-provider";

/**
 * The command palette (Ctrl or Cmd + K, or `/`): jump to any view, list or tag, or run an action.
 * Type to filter; Enter runs the highlighted item; Escape closes it.
 */
export function CommandPalette() {
  const router = useRouter();
  const { lists, tags } = useTodos();
  const { theme = "system", setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [creatingList, setCreatingList] = useState(false);

  useEffect(() => {
    const show = () => setOpen(true);
    window.addEventListener(OPEN_PALETTE_EVENT, show);
    return () => window.removeEventListener(OPEN_PALETTE_EVENT, show);
  }, []);

  const views = [
    ...enabledModules("primary").flatMap(navItemsFor),
    { label: "Settings", route: "/settings" },
    ...enabledModules("modules").flatMap((m) => m.paletteRoutes ?? navItemsFor(m)),
  ];

  function go(route: string) {
    setOpen(false);
    router.push(route);
  }

  function act(action: () => void) {
    setOpen(false);
    // Let the palette close first so a dialog opened by the action can take focus.
    window.setTimeout(action, 50);
  }

  async function signOut() {
    const { error } = await authClient.signOut();
    if (!error) {
      router.replace("/sign-in");
      router.refresh();
    }
  }

  const nextTheme = theme === "dark" ? "light" : theme === "light" ? "system" : "dark";

  return (
    <>
      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Command palette"
        description="Jump to a view, list or tag, or run an action."
      >
        <CommandInput placeholder="Type a command, list or tag" />
        <CommandList>
          <CommandEmpty>Nothing matches that.</CommandEmpty>

          <CommandGroup heading="Actions">
            <CommandItem
              value="new task add quick"
              onSelect={() => act(() => window.dispatchEvent(new Event(QUICK_ADD_EVENT)))}
            >
              New task
            </CommandItem>
            <CommandItem value="new list create" onSelect={() => act(() => setCreatingList(true))}>
              New list
            </CommandItem>
            <CommandItem
              value="keyboard shortcuts help"
              onSelect={() => act(() => window.dispatchEvent(new Event(OPEN_HELP_EVENT)))}
            >
              Show keyboard shortcuts
            </CommandItem>
            <CommandItem
              value="theme dark light system appearance"
              onSelect={() => act(() => setTheme(nextTheme))}
            >
              Switch theme (now {theme}, next {nextTheme})
            </CommandItem>
            <CommandItem value="sign out log out" onSelect={() => act(() => void signOut())}>
              Sign out
            </CommandItem>
          </CommandGroup>

          <CommandGroup heading="Go to">
            {views.map((v) => (
              <CommandItem key={v.route} value={`go ${v.label}`} onSelect={() => go(v.route)}>
                {v.label}
              </CommandItem>
            ))}
          </CommandGroup>

          {lists.some((l) => !l.isInbox) ? (
            <>
              <CommandGroup heading="Lists">
                {lists
                  .filter((l) => !l.isInbox)
                  .map((l) => (
                    <CommandItem
                      key={l.id}
                      value={`list ${l.name}`}
                      onSelect={() => go(`/lists/${l.id}`)}
                    >
                      {l.icon ? <span aria-hidden>{l.icon}</span> : null}
                      {l.name}
                    </CommandItem>
                  ))}
              </CommandGroup>
            </>
          ) : null}

          {tags.length > 0 ? (
            <>
              <CommandGroup heading="Tags">
                {tags.map((t) => (
                  <CommandItem
                    key={t.id}
                    value={`tag ${t.name}`}
                    onSelect={() => go(`/tags/${t.id}`)}
                  >
                    #{t.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          ) : null}
        </CommandList>
      </CommandDialog>
      <ListFormDialog open={creatingList} onOpenChange={setCreatingList} />
    </>
  );
}
