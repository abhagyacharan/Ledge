"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  createContext,
  use,
  useTransition,
  type ReactNode,
  type TransitionStartFunction,
} from "react";

/**
 * One shared "loading the next view" state for the expense tracker. The period picker, the
 * search box and the filters all change the address; while the new figures load, the old ones
 * stay on screen, dimmed, instead of flashing a skeleton for a month switch.
 */
type Pending = { pending: boolean; start: TransitionStartFunction };

const PendingContext = createContext<Pending | null>(null);

export function ExpensesPendingProvider({ children }: { children: ReactNode }) {
  const [pending, start] = useTransition();
  return <PendingContext value={{ pending, start }}>{children}</PendingContext>;
}

export function usePending(): Pending {
  const shared = use(PendingContext);
  const [pending, start] = useTransition();
  return shared ?? { pending, start };
}

/** Dims its content while the next view loads. The dim waits a moment, so fast loads never blink. */
export function PendingRegion({ children }: { children: ReactNode }) {
  const { pending } = usePending();
  return (
    <div
      aria-busy={pending || undefined}
      data-pending={pending || undefined}
      className="transition-opacity duration-200 ease-snap data-pending:opacity-55 data-pending:delay-150"
    >
      {children}
    </div>
  );
}

/** Changes query parameters (null removes one) inside the shared transition. */
export function useQueryUpdate() {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const { start } = usePending();
  return (patch: Record<string, string | null>, then?: () => void) => {
    const next = new URLSearchParams(search.toString());
    for (const [key, value] of Object.entries(patch)) {
      if (value === null || value === "") next.delete(key);
      else next.set(key, value);
    }
    const query = next.toString();
    start(() => {
      then?.();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    });
  };
}
