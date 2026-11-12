"use client";

import { Drawer } from "@base-ui/react/drawer";
import { X } from "lucide-react";
import { useRef, type ReactNode, type RefObject } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { isTouchDevice } from "@/lib/touch";
import { cn } from "@/lib/utils";
import { dashButton } from "./dash-button";

/**
 * The dashboard sheet (docs/design.md §4), built on Base UI's Drawer: on a phone a bottom sheet
 * you can swipe down to close, keyboard aware; with a mouse a panel that slides in from the
 * right. Compose it as Sheet > (form) > SheetHeader, SheetBody, SheetFooter.
 */
export function Sheet({
  open,
  onOpenChange,
  onClosed,
  initialFocus,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Runs once the closing slide has finished (a good moment to reset what the sheet shows). */
  onClosed?: () => void;
  /**
   * What to focus on open with a mouse or keyboard; by default the first field. On a touch
   * screen nothing inside is focused, so the keyboard stays closed until you tap a field.
   */
  initialFocus?: RefObject<HTMLElement | null> | boolean;
  children: ReactNode;
}) {
  const mobile = useIsMobile();
  const popupRef = useRef<HTMLDivElement>(null);
  const focusOnOpen = (): boolean | HTMLElement => {
    if (isTouchDevice()) return popupRef.current ?? false;
    if (initialFocus && typeof initialFocus === "object") return initialFocus.current ?? true;
    return initialFocus ?? true;
  };
  return (
    <Drawer.Root
      open={open}
      onOpenChange={(next) => onOpenChange(next)}
      onOpenChangeComplete={(next) => (next ? undefined : onClosed?.())}
      swipeDirection={mobile ? "down" : "right"}
    >
      <Drawer.VirtualKeyboardProvider>
        <Drawer.Portal>
          {/* The page behind is blurred and only lightly tinted, so it stays visible but out of
              the way (O, 2026-11-12). The layer fades in and out, and follows a swipe. */}
          <Drawer.Backdrop className="fixed inset-0 z-50 bg-black/15 opacity-[calc(1-var(--drawer-swipe-progress))] backdrop-blur-[6px] transition-opacity duration-[400ms] ease-sheet data-ending-style:opacity-0 data-ending-style:duration-[calc(var(--drawer-swipe-strength)*400ms)] data-starting-style:opacity-0 data-swiping:duration-0 supports-[-webkit-touch-callout:none]:absolute supports-[-webkit-touch-callout:none]:min-h-dvh dark:bg-black/35" />
          <Drawer.Viewport
            className={cn(
              "fixed inset-0 z-50 flex",
              mobile ? "items-end justify-center" : "items-stretch justify-end",
            )}
          >
            <Drawer.Popup
              ref={popupRef}
              initialFocus={focusOnOpen}
              className={cn(
                "dash flex flex-col bg-dash-card text-dash-ink outline-none will-change-transform data-swiping:select-none data-ending-style:duration-[calc(var(--drawer-swipe-strength)*400ms)]",
                mobile
                  ? // The extra 3rem below the screen edge hides the gap when the sheet is pulled up.
                    "-mb-12 max-h-[calc(92dvh+3rem)] w-full rounded-t-3xl pb-12 [transform:translateY(var(--drawer-swipe-movement-y))] transition-transform duration-[400ms] ease-sheet data-ending-style:[transform:translateY(calc(100%-3rem+2px))] data-starting-style:[transform:translateY(calc(100%-3rem+2px))]"
                  : "h-full w-[28rem] max-w-[calc(100vw-2rem)] border-l border-dash-edge [transform:translateX(var(--drawer-swipe-movement-x))] transition-transform duration-300 ease-sheet data-ending-style:[transform:translateX(100%)] data-starting-style:[transform:translateX(100%)]",
              )}
            >
              {children}
            </Drawer.Popup>
          </Drawer.Viewport>
        </Drawer.Portal>
      </Drawer.VirtualKeyboardProvider>
    </Drawer.Root>
  );
}

/** Title row with the grab handle (phones) and a close button. `action` sits beside the close. */
export function SheetHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="relative shrink-0 px-5 pt-5 pb-3 select-none md:px-6 md:pt-6">
      <div
        aria-hidden
        className="absolute top-2 left-1/2 h-1 w-10 -translate-x-1/2 rounded-full bg-dash-edge md:hidden"
      />
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1 pt-1">
          <Drawer.Title className="text-lg font-semibold text-balance">{title}</Drawer.Title>
          {description ? (
            <Drawer.Description className="mt-0.5 text-[13px] text-dash-ink-soft">
              {description}
            </Drawer.Description>
          ) : null}
        </div>
        {action}
        <Drawer.Close aria-label="Close" className={dashButton({ variant: "well", size: "icon" })}>
          <X />
        </Drawer.Close>
      </div>
    </div>
  );
}

/** The scrolling middle of a sheet. */
export function SheetBody({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <Drawer.Content
      className={cn(
        "min-h-0 flex-1 touch-auto overflow-y-auto overscroll-contain px-5 pt-1 pb-6 md:px-6",
        className,
      )}
    >
      {children}
    </Drawer.Content>
  );
}

/** Actions pinned under the body, clear of the phone's home bar. */
export function SheetFooter({ children }: { children: ReactNode }) {
  return (
    <div className="flex shrink-0 items-center gap-2 border-t border-dash-edge px-5 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] md:px-6 md:pb-6">
      {children}
    </div>
  );
}
