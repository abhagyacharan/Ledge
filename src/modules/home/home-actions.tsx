"use client";

import { IndianRupee, Plus, Search } from "lucide-react";
import { useEffect } from "react";
import { cn } from "@/lib/utils";
import { useLogTransaction } from "@/modules/expenses/components/transaction-launcher";
import { QUICK_ADD_EVENT } from "@/modules/todos/components/quick-add-button";
import { OPEN_PALETTE_EVENT } from "@/modules/todos/components/shortcuts";

/**
 * Home's capture buttons (docs/new_design.md screens 1a and 1e): Add a task (q) opens quick add,
 * Log a transaction (t) opens the expense sheet in place, and on desktop "Jump to anything"
 * opens the command palette (Ctrl K).
 */

const base =
  "inline-flex h-13 min-w-0 cursor-pointer items-center justify-center gap-1.5 rounded-full px-3 text-[14px] min-[400px]:px-5 min-[400px]:text-[15px] md:gap-2 font-semibold whitespace-nowrap outline-none transition-[transform,background-color] duration-150 ease-snap focus-visible:shadow-[0_0_0_2px_var(--background),0_0_0_4px_var(--dash-ink)] active:scale-[0.97] md:h-11 md:text-sm";

function Kbd({ children, dark = false }: { children: string; dark?: boolean }) {
  return (
    <kbd
      aria-hidden
      className={cn(
        "hidden rounded-[5px] px-1.5 py-0.5 font-mono text-[11px] leading-none font-medium md:inline",
        dark ? "bg-white/15 text-dash-card" : "bg-dash-well text-dash-ink-soft",
      )}
    >
      {children}
    </kbd>
  );
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

export function HomeActions() {
  const { open } = useLogTransaction();

  // t logs a transaction while you are on Home (q, quick add, works everywhere already).
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "t" || event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTypingTarget(event.target) || document.querySelector("[role=dialog]")) return;
      event.preventDefault();
      open("expense");
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <div className="grid grid-cols-2 gap-2.5 md:flex md:items-center">
      <button
        type="button"
        onClick={() => window.dispatchEvent(new Event(QUICK_ADD_EVENT))}
        aria-keyshortcuts="q"
        className={cn(base, "bg-dash-ink text-dash-card hover:bg-dash-ink/85")}
      >
        <Plus aria-hidden className="size-4.5" strokeWidth={2.25} />
        Add a task
        <Kbd dark>Q</Kbd>
      </button>
      <button
        type="button"
        onClick={() => open("expense")}
        aria-keyshortcuts="t"
        className={cn(
          base,
          "border border-dash-edge bg-dash-card text-dash-ink hover:bg-dash-well",
        )}
      >
        <IndianRupee aria-hidden className="size-4.5" strokeWidth={2} />
        Log a transaction
        <Kbd>T</Kbd>
      </button>
      <button
        type="button"
        onClick={() => window.dispatchEvent(new Event(OPEN_PALETTE_EVENT))}
        aria-keyshortcuts="Control+K"
        className="ml-auto hidden h-10 cursor-pointer items-center gap-2 rounded-full bg-dash-track px-4 text-[13px] text-dash-ink-soft outline-none transition-colors duration-150 hover:bg-dash-well hover:text-dash-ink focus-visible:shadow-[0_0_0_2px_var(--background),0_0_0_4px_var(--dash-ink)] md:inline-flex"
      >
        <Search aria-hidden className="size-3.5" />
        Jump to anything
        <kbd className="rounded-[5px] bg-dash-card px-1.5 py-0.5 font-mono text-[11px] leading-none font-medium text-dash-ink-soft">
          Ctrl K
        </kbd>
      </button>
    </div>
  );
}

/** Home's Search tile: opens the same palette as Ctrl K, the sidebar row and the header button. */
export function SearchTile({ className }: { className: string }) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(OPEN_PALETTE_EVENT))}
      className={className}
    >
      <Search aria-hidden className="size-4.5" strokeWidth={1.85} />
      Search
    </button>
  );
}
