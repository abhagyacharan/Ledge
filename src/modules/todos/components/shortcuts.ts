/** Events that open global UI from anywhere (the palette, the help dialog). */
export const OPEN_PALETTE_EVENT = "ledge:open-palette";
export const OPEN_HELP_EVENT = "ledge:open-help";

/** The keyboard shortcuts, shown in the help dialog (press ?). Keep in step with the handlers. */
export const SHORTCUTS: { keys: string[]; label: string }[] = [
  { keys: ["Ctrl", "K"], label: "Open the command palette (Cmd+K on a Mac)" },
  { keys: ["/"], label: "Open the command palette to jump somewhere" },
  { keys: ["q"], label: "Quick add a task" },
  { keys: ["j"], label: "Move down to the next task (or the Down arrow)" },
  { keys: ["k"], label: "Move up to the previous task (or the Up arrow)" },
  { keys: ["Enter"], label: "Open the selected task" },
  { keys: ["x"], label: "Tick or untick the selected task" },
  { keys: ["e"], label: "Edit the title of the selected task" },
  { keys: ["Esc"], label: "Close the task panel or a dialog" },
  { keys: ["?"], label: "Show this list" },
];
