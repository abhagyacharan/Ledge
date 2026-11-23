"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * `n` on Plans home starts a new plan. It ignores typing in a field, held modifier keys and an
 * open dialog or sheet, like the other single-key shortcuts (src/modules/todos/shortcuts.ts).
 */
export function NewPlanShortcut({ enabled = true }: { enabled?: boolean }) {
  const router = useRouter();

  useEffect(() => {
    if (!enabled) return;
    function onKey(event: KeyboardEvent) {
      if (event.key !== "n" || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) {
        return;
      }
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable='true']")) return;
      if (document.querySelector("[role='dialog'], [role='alertdialog']")) return;
      event.preventDefault();
      router.push("/plans/new");
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enabled, router]);

  return null;
}
