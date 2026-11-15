"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

const button =
  "h-12 w-full rounded-full text-[15px] font-semibold md:h-11 md:text-sm focus-visible:shadow-[0_0_0_2px_var(--dash-card),0_0_0_4px_var(--dash-ink)]";

/**
 * Confirmation before something that is hard to undo (docs/new_design.md screen 2i): the
 * destructive choice as a red pill, an optional gentler alternative under it, then Cancel.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  onConfirm,
  alternativeLabel,
  onAlternative,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
  /** A second way through, such as "Move tasks to General, then delete". */
  alternativeLabel?: string;
  onAlternative?: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="dash rounded-3xl border-dash-edge bg-dash-card p-6 text-dash-ink sm:max-w-sm">
        <AlertDialogHeader className="text-left sm:text-left">
          <AlertDialogTitle className="font-display text-xl font-semibold">
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm text-dash-ink-soft">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="mt-2 flex flex-col gap-2">
          <AlertDialogAction
            className={cn(
              button,
              "bg-dash-bad text-white hover:bg-dash-bad/90 dark:text-dash-card",
            )}
            onClick={onConfirm}
          >
            {confirmLabel}
          </AlertDialogAction>
          {alternativeLabel && onAlternative ? (
            <AlertDialogAction
              className={cn(
                button,
                "border border-dash-edge bg-dash-card text-dash-ink hover:bg-dash-well",
              )}
              onClick={onAlternative}
            >
              {alternativeLabel}
            </AlertDialogAction>
          ) : null}
          <AlertDialogCancel
            className={cn(button, "border-0 bg-transparent shadow-none hover:bg-dash-well")}
          >
            Cancel
          </AlertDialogCancel>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
