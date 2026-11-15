"use client";

import {
  CornerDownLeft,
  Folder,
  IndianRupee,
  Keyboard,
  LogOut,
  Mic,
  Moon,
  Plus,
  Search,
  Settings,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Command as Cmdk } from "cmdk";
import { useEffect, useState, type ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { enabledModules } from "@/config/modules";
import { authClient } from "@/lib/auth-client";
import { LOG_TRANSACTION_EVENT } from "@/modules/expenses/components/transaction-launcher";
import { sendVoice, useVoiceAvailable } from "@/modules/voice/components/voice-events";
import { ListFormDialog } from "./list-form-dialog";
import { ListGlyph } from "../list-icons";
import { QUICK_ADD_EVENT } from "./quick-add-button";
import { OPEN_HELP_EVENT, OPEN_PALETTE_EVENT } from "./shortcuts";
import { useTodos } from "./todos-provider";

const groupClass =
  "px-2 pb-1 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:font-mono [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-dash-ink-soft";
const itemClass =
  "flex h-11 cursor-pointer items-center gap-3 rounded-xl px-2.5 text-[14px] text-dash-ink outline-none select-none data-[selected=true]:bg-dash-well [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-dash-ink-soft data-[selected=true]:[&_svg]:text-dash-accent";

function Kbd({ children }: { children: string }) {
  return (
    <kbd className="ml-auto rounded-[5px] bg-dash-well px-1.5 py-0.5 font-mono text-[11px] font-medium text-dash-ink-soft">
      {children}
    </kbd>
  );
}

function Item({
  value,
  icon: Icon,
  onSelect,
  hint,
  children,
  forceMount,
}: {
  value: string;
  icon?: LucideIcon;
  onSelect: () => void;
  hint?: string;
  children: ReactNode;
  forceMount?: boolean;
}) {
  return (
    <Cmdk.Item value={value} onSelect={onSelect} className={itemClass} forceMount={forceMount}>
      {Icon ? <Icon aria-hidden /> : null}
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {hint ? <Kbd>{hint}</Kbd> : null}
    </Cmdk.Item>
  );
}

/**
 * The command palette, Ctrl or Cmd + K (docs/new_design.md §4 and screen 1f): a 56px search field,
 * then Go to, Actions, your lists and "Search everything" for the words typed, in 44px rows with
 * their shortcuts. Enter runs the highlighted row; Escape closes it.
 */
export function CommandPalette() {
  const router = useRouter();
  const { lists } = useTodos();
  const { theme = "system", setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [creatingList, setCreatingList] = useState(false);
  const voice = useVoiceAvailable();

  useEffect(() => {
    const show = () => {
      setQuery("");
      setOpen(true);
    };
    window.addEventListener(OPEN_PALETTE_EVENT, show);
    return () => window.removeEventListener(OPEN_PALETTE_EVENT, show);
  }, []);

  // "Expense Tracker: Income", "Tasks: Today", ... then the shared places.
  const views: { label: string; route: string; icon: LucideIcon }[] = [
    ...enabledModules().flatMap((m) =>
      m.nav.length === 0
        ? [{ label: m.label, route: m.route, icon: m.icon }]
        : m.nav.map((item) => ({
            label: `${m.label}: ${item.label}`,
            route: item.route,
            icon: item.icon,
          })),
    ),
    { label: "Search", route: "/search", icon: Search },
    { label: "Trash", route: "/trash", icon: Trash2 },
    { label: "Settings", route: "/settings", icon: Settings },
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
  const words = query.trim();

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          showCloseButton={false}
          className="dash top-[18%] max-w-[calc(100%-2rem)] translate-y-0 gap-0 overflow-hidden rounded-2xl! border border-dash-edge bg-dash-card p-0 text-dash-ink sm:max-w-xl"
        >
          <DialogHeader className="sr-only">
            <DialogTitle>Command palette</DialogTitle>
            <DialogDescription>Jump to a page or list, run an action, or search.</DialogDescription>
          </DialogHeader>
          <Cmdk loop>
            <div className="flex h-14 items-center gap-3 border-b border-dash-edge px-4">
              <Search aria-hidden className="size-4 text-dash-ink-soft" />
              <Cmdk.Input
                value={query}
                onValueChange={setQuery}
                placeholder="Jump to anything, or search"
                className="h-full min-w-0 flex-1 bg-transparent text-base text-dash-ink outline-none placeholder:text-dash-ink-soft md:text-[15px]"
              />
              <Kbd>Esc</Kbd>
            </div>
            <Cmdk.List className="max-h-[min(60vh,26rem)] overflow-y-auto pb-2">
              <Cmdk.Empty className="px-4 py-6 text-sm text-dash-ink-soft">
                Nothing to jump to. Press Enter to search everything.
              </Cmdk.Empty>

              <Cmdk.Group heading="Go to" className={groupClass}>
                {views.map((v) => (
                  <Item
                    key={v.route}
                    value={`go ${v.label}`}
                    icon={v.icon}
                    onSelect={() => go(v.route)}
                  >
                    {v.label}
                  </Item>
                ))}
              </Cmdk.Group>

              <Cmdk.Group heading="Actions" className={groupClass}>
                <Item
                  value="add a task new quick"
                  icon={Plus}
                  hint="Q"
                  onSelect={() => act(() => window.dispatchEvent(new Event(QUICK_ADD_EVENT)))}
                >
                  Add a task
                </Item>
                <Item
                  value="log a transaction expense money income"
                  icon={IndianRupee}
                  onSelect={() =>
                    act(() =>
                      window.dispatchEvent(
                        new CustomEvent(LOG_TRANSACTION_EVENT, { detail: "expense" }),
                      ),
                    )
                  }
                >
                  Log a transaction
                </Item>
                {voice ? (
                  <Item
                    value="speak voice talk dictate add"
                    icon={Mic}
                    hint="V"
                    onSelect={() => act(() => sendVoice("toggle"))}
                  >
                    Speak to add
                  </Item>
                ) : null}
                <Item
                  value="new list create"
                  icon={Folder}
                  onSelect={() => act(() => setCreatingList(true))}
                >
                  New list
                </Item>
                <Item
                  value="keyboard shortcuts help"
                  icon={Keyboard}
                  hint="?"
                  onSelect={() => act(() => window.dispatchEvent(new Event(OPEN_HELP_EVENT)))}
                >
                  Keyboard shortcuts
                </Item>
                <Item
                  value="theme dark light system appearance"
                  icon={Moon}
                  onSelect={() => act(() => setTheme(nextTheme))}
                >
                  Switch theme (now {theme}, next {nextTheme})
                </Item>
                <Item
                  value="sign out log out"
                  icon={LogOut}
                  onSelect={() => act(() => void signOut())}
                >
                  Sign out
                </Item>
              </Cmdk.Group>

              <Cmdk.Group heading="Lists" className={groupClass}>
                {lists.map((l) => (
                  <Cmdk.Item
                    key={l.id}
                    value={`list ${l.name}`}
                    onSelect={() => go(`/lists/${l.id}`)}
                    className={itemClass}
                  >
                    <ListGlyph icon={l.icon} className="size-4" />
                    <span className="min-w-0 flex-1 truncate">{l.name}</span>
                  </Cmdk.Item>
                ))}
              </Cmdk.Group>

              {words ? (
                <Cmdk.Group heading="Search everything" className={groupClass} forceMount>
                  <Item
                    value={`search ${words}`}
                    icon={Search}
                    forceMount
                    onSelect={() => go(`/search?q=${encodeURIComponent(words)}`)}
                  >
                    Search tasks and money for &ldquo;
                    <span className="font-semibold underline decoration-dash-accent decoration-2 underline-offset-[3px]">
                      {words}
                    </span>
                    &rdquo;
                  </Item>
                </Cmdk.Group>
              ) : null}
            </Cmdk.List>
            <div
              aria-hidden
              className="flex items-center gap-3 border-t border-dash-edge px-4 py-2 text-xs text-dash-ink-soft"
            >
              <CornerDownLeft className="size-3.5" /> open
              <span>↑ ↓ move</span>
            </div>
          </Cmdk>
        </DialogContent>
      </Dialog>
      <ListFormDialog open={creatingList} onOpenChange={setCreatingList} />
    </>
  );
}
