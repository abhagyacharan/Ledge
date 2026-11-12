/**
 * Phones and tablets (a touch screen is the main pointer). Used to keep the on-screen keyboard
 * from opening by itself when a sheet or dialog appears: the keyboard covers half the screen, so
 * you see the form first and tap a field when you want to type (O, 2026-11-13). Mouse users
 * still land in the first field.
 */
export function isTouchDevice(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
}

/**
 * For a Radix dialog's `onOpenAutoFocus`: on a touch screen, focus the dialog itself instead of
 * its first field, so the keyboard stays closed. Does nothing for a mouse.
 */
export function keepKeyboardClosed(event: Event) {
  if (!isTouchDevice()) return;
  event.preventDefault();
  (event.currentTarget as HTMLElement | null)?.focus?.({ preventScroll: true });
}
