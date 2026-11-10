"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { OPEN_HELP_EVENT, SHORTCUTS } from "./shortcuts";

/** The keyboard shortcut list, opened with `?`. */
export function ShortcutsHelp() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const show = () => setOpen(true);
    window.addEventListener(OPEN_HELP_EVENT, show);
    return () => window.removeEventListener(OPEN_HELP_EVENT, show);
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
          <DialogDescription>Plain keys work when you are not typing in a box.</DialogDescription>
        </DialogHeader>
        <dl className="flex flex-col gap-2">
          {SHORTCUTS.map((s) => (
            <div key={s.label} className="flex items-center justify-between gap-4 text-sm">
              <dt>{s.label}</dt>
              <dd className="flex shrink-0 gap-1">
                {s.keys.map((key) => (
                  <kbd
                    key={key}
                    className="rounded border bg-muted px-1.5 py-0.5 font-mono text-xs"
                  >
                    {key}
                  </kbd>
                ))}
              </dd>
            </div>
          ))}
        </dl>
      </DialogContent>
    </Dialog>
  );
}
