"use client";

import { Plus } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createContext, use, useCallback, useEffect, useState, type ReactNode } from "react";
import { FAB_CLASS, FAB_ICON_CLASS, FabVoiceHint } from "@/components/shell/fab";
import { useHoldToTalk, useVoiceAvailable } from "@/modules/voice/components/voice-events";
import { useOpenOnArrival } from "@/hooks/use-open-on-arrival";
import { cn } from "@/lib/utils";
import type { EntryKind } from "@/server/db/schema";
import { KIND_ROUTES } from "../categories";
import { dateInPeriod, parsePeriod, periodFromToday } from "../periods";
import { EntrySheet } from "./entry-sheet";

/**
 * "Log a transaction": one sheet for adding money entries. On Expense Tracker pages a round +
 * opens it on the page's kind; the app-wide instance (no button) answers Home's button and quick
 * add's type row. The header's Add buttons open the same sheet.
 */

type Launcher = { open: (kind: EntryKind, date?: string) => void };

/** Opens the app-wide transaction sheet from anywhere (quick add's type row). */
export const LOG_TRANSACTION_EVENT = "ledge:log-transaction";

const LauncherContext = createContext<Launcher | null>(null);

export function useLogTransaction(): Launcher {
  const launcher = use(LauncherContext);
  if (!launcher) throw new Error("useLogTransaction needs a TransactionLauncher above it");
  return launcher;
}

/** The kind the + opens on each page: the area's own kind, an expense everywhere else. */
function kindForPath(pathname: string): EntryKind {
  const match = (Object.entries(KIND_ROUTES) as [EntryKind, string][]).find(
    ([, route]) => pathname === route,
  );
  return match?.[0] ?? "expense";
}

export function TransactionLauncher({
  currency,
  today,
  button = true,
  listen = false,
  children,
}: {
  /** The app-wide launcher: opens its sheet when LOG_TRANSACTION_EVENT is sent. */
  listen?: boolean;
  currency: string;
  today: string;
  /** The round + button and its menu. Home leaves it out: its own + adds a task. */
  button?: boolean;
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const voice = useVoiceAvailable();
  const hold = useHoldToTalk(voice);
  const search = useSearchParams();
  const [sheet, setSheet] = useState<{
    open: boolean;
    kind: EntryKind;
    n: number;
    /** The day a new entry starts on (a day opened from the Journal); today otherwise. */
    date?: string;
  }>({
    open: false,
    kind: "expense",
    n: 0,
  });

  const open = useCallback(
    (kind: EntryKind, date?: string) => setSheet((s) => ({ open: true, kind, date, n: s.n + 1 })),
    [],
  );

  // The welcome page's "Log a transaction" button arrives with ?add=transaction.
  useOpenOnArrival("transaction", () => {
    if (button) open(kindForPath(pathname));
  });

  useEffect(() => {
    if (!listen) return;
    const onEvent = (event: Event) => open((event as CustomEvent<EntryKind>).detail ?? "expense");
    window.addEventListener(LOG_TRANSACTION_EVENT, onEvent);
    return () => window.removeEventListener(LOG_TRANSACTION_EVENT, onEvent);
  }, [listen, open]);

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

      {/* The round + opens the sheet on the kind that fits the page (docs/new_design.md §5
          "Capture sheet"): Income on Income, EMIs on EMIs, an expense elsewhere. The sheet's type
          row switches kind, or hands over to quick add. */}
      {button ? (
        <button
          type="button"
          aria-label="Log a transaction"
          title={voice ? "Log a transaction · hold to speak" : "Log a transaction"}
          data-fab
          {...hold.handlers}
          onClick={() => {
            if (!hold.consumeHold()) open(kindForPath(pathname));
          }}
          className={FAB_CLASS}
        >
          <Plus aria-hidden className={cn(FAB_ICON_CLASS, sheet.open && "rotate-45")} />
        </button>
      ) : null}
      {button && voice ? <FabVoiceHint /> : null}

      <EntrySheet
        formKey={`new-${sheet.kind}-${sheet.n}`}
        open={sheet.open}
        onOpenChange={(next) => setSheet((s) => ({ ...s, open: next }))}
        kind={sheet.kind}
        context={{ currency, today }}
        defaultDate={sheet.date}
        addedAction={addedAction}
        onKindChange={(kind) => setSheet((s) => ({ ...s, kind, n: s.n + 1 }))}
      />
    </LauncherContext>
  );
}
