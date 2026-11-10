"use client";

import { CommandPalette } from "./command-palette";
import { KeyboardShortcuts } from "./keyboard-shortcuts";
import { QuickAdd } from "./quick-add";
import { ShortcutsHelp } from "./shortcuts-help";

/** Everything the tasks module keeps mounted on every screen. Registered as the module's `Global`. */
export function TodoGlobal() {
  return (
    <>
      <QuickAdd />
      <KeyboardShortcuts />
      <CommandPalette />
      <ShortcutsHelp />
    </>
  );
}
