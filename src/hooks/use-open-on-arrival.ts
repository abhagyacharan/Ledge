"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * Opens something (quick add, the Log a transaction menu) when the page is reached with
 * `?add=<what>`, as the welcome page's buttons do, then takes `add` out of the address so a
 * reload or Back does not open it again. Other parameters (the expense period) are kept.
 */
export function useOpenOnArrival(what: "task" | "transaction", open: () => void) {
  const search = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const wanted = search.get("add") === what;
  // Read the latest `open` without re-running the effect when it changes identity.
  const openRef = useRef(open);
  useEffect(() => {
    openRef.current = open;
  });

  useEffect(() => {
    if (!wanted) return;
    openRef.current();
    const rest = new URLSearchParams(search.toString());
    rest.delete("add");
    const query = rest.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [wanted, search, pathname, router]);
}
