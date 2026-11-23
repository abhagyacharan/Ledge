"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { Result } from "@/lib/result";

/**
 * Autosave for one Settings row (screen 9o): the control changes at once, "Saved" shows for about
 * 2 seconds when the server agrees, and on a failure the control goes back to its old value with
 * "Couldn't save. Try again." beside it. Try again puts the new value back and saves once more.
 */
export function useSave() {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [retry, setRetry] = useState<(() => void) | null>(null);

  function save(
    action: () => Promise<Result<unknown>>,
    { apply, undo }: { apply: () => void; undo: () => void },
  ) {
    apply();
    setRetry(null);
    startTransition(async () => {
      let saved = false;
      try {
        saved = (await action()).ok;
      } catch {
        saved = false;
      }
      if (saved) {
        setSavedAt(Date.now());
        router.refresh();
        return;
      }
      undo();
      setRetry(() => () => save(action, { apply, undo }));
    });
  }

  return { save, savedAt, retry, failed: retry !== null };
}
