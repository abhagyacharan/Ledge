"use client";

import { Landmark, Plus, ShoppingBag, TrendingUp, Wallet, type LucideIcon } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { DropdownMenu as Menu } from "radix-ui";
import { createContext, use, useCallback, useRef, useState, type ReactNode } from "react";
import { FAB_CLASS, FAB_ICON_CLASS } from "@/components/shell/fab";
import { cn } from "@/lib/utils";
import type { EntryKind } from "@/server/db/schema";
import { KIND_ROUTES } from "../categories";
import { dateInPeriod, parsePeriod, periodFromToday } from "../periods";
import { EntrySheet } from "./entry-sheet";

/**
 * "Log a transaction" for the whole expense tracker. A round button (where the task quick-add
 * button sits on other screens) opens a short menu: Income, Expense, EMI or loan, Investment.
 * Picking one opens that kind's form in a sheet. The tabs' own Add buttons open the same sheet.
 */

type Launcher = { open: (kind: EntryKind) => void };

const LauncherContext = createContext<Launcher | null>(null);

export function useLogTransaction(): Launcher {
  const launcher = use(LauncherContext);
  if (!launcher) throw new Error("useLogTransaction needs a TransactionLauncher above it");
  return launcher;
}

const OPTIONS: { kind: EntryKind; label: string; hint: string; icon: LucideIcon }[] = [
  { kind: "income", label: "Income", hint: "Salary, bonus, refunds", icon: Wallet },
  { kind: "expense", label: "Expense", hint: "Something you paid for", icon: ShoppingBag },
  { kind: "emi", label: "EMI or loan", hint: "A loan, EMI or card bill", icon: Landmark },
  { kind: "investment", label: "Investment", hint: "Funds, stocks, deposits", icon: TrendingUp },
];

export function TransactionLauncher({
  currency,
  today,
  children,
}: {
  currency: string;
  today: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const [menuOpen, setMenuOpen] = useState(false);
  const [sheet, setSheet] = useState<{ open: boolean; kind: EntryKind; n: number }>({
    open: false,
    kind: "expense",
    n: 0,
  });
  // Picking from the menu hands focus to the sheet, so the menu must not take it back on close.
  const picked = useRef(false);

  const open = useCallback(
    (kind: EntryKind) => setSheet((s) => ({ open: true, kind, n: s.n + 1 })),
    [],
  );

  /** "View" in the Added toast, unless the new entry is already on screen. */
  function addedAction(entryDate: string) {
    const route = KIND_ROUTES[sheet.kind];
    const shown = parsePeriod(Object.fromEntries(search.entries()), periodFromToday(today));
    if (pathname === route && dateInPeriod(entryDate, shown)) return undefined;
    const query = `?y=${entryDate.slice(0, 4)}&m=${Number(entryDate.slice(5, 7))}`;
    return { label: "View", onClick: () => router.push(`${route}${query}`) };
  }

  return (
    <LauncherContext value={{ open }}>
      {children}

      <Menu.Root open={menuOpen} onOpenChange={setMenuOpen} modal={false}>
        <Menu.Trigger aria-label="Log a transaction" className={FAB_CLASS}>
          {/* The plus turns into a cross while the menu is open. */}
          <Plus aria-hidden className={cn(FAB_ICON_CLASS, menuOpen && "rotate-45")} />
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Content
            side="top"
            align="end"
            sideOffset={12}
            collisionPadding={16}
            onCloseAutoFocus={(event) => {
              if (picked.current) event.preventDefault();
              picked.current = false;
            }}
            className="dash z-40 w-72 origin-(--radix-dropdown-menu-content-transform-origin) rounded-2xl border border-dash-edge bg-dash-card p-2 text-dash-ink shadow-[0_24px_48px_-16px_rgb(0_0_0/0.35)] outline-none data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-90 data-[state=open]:duration-200 data-[state=closed]:duration-150"
          >
            <Menu.Label className="px-3 pt-2 pb-1.5 text-xs font-medium text-dash-ink-soft">
              Log a transaction
            </Menu.Label>
            {OPTIONS.map((option) => (
              <Menu.Item
                key={option.kind}
                onSelect={() => {
                  picked.current = true;
                  open(option.kind);
                }}
                className="group flex cursor-pointer items-center gap-3 rounded-xl px-2 py-2 outline-none select-none transition-colors duration-100 data-[highlighted]:bg-dash-well"
              >
                <span
                  aria-hidden
                  className="grid size-10 shrink-0 place-items-center rounded-full bg-dash-well transition-colors duration-100 group-data-[highlighted]:bg-dash-card"
                >
                  <option.icon className="size-[18px]" strokeWidth={1.75} />
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="text-sm font-medium">{option.label}</span>
                  <span className="text-xs text-dash-ink-soft">{option.hint}</span>
                </span>
              </Menu.Item>
            ))}
          </Menu.Content>
        </Menu.Portal>
      </Menu.Root>

      <EntrySheet
        formKey={`new-${sheet.kind}-${sheet.n}`}
        open={sheet.open}
        onOpenChange={(next) => setSheet((s) => ({ ...s, open: next }))}
        kind={sheet.kind}
        context={{ currency, today }}
        addedAction={addedAction}
      />
    </LauncherContext>
  );
}
