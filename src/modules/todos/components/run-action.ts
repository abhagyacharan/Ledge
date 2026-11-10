import { toast } from "sonner";
import type { Result } from "@/lib/result";

/** Awaits a server action and shows a toast when it fails (CLAUDE.md §6.2: toast on failure). */
export async function run<T>(
  action: Promise<Result<T>>,
  options: { success?: string } = {},
): Promise<Result<T>> {
  try {
    const result = await action;
    if (!result.ok) toast.error(result.error);
    else if (options.success) toast.success(options.success);
    return result;
  } catch {
    toast.error("Couldn't reach the server. Check your connection and try again.");
    return { ok: false, error: "network" };
  }
}

/** How long an Undo toast stays on screen (CLAUDE.md §6.2: about 5 seconds). */
export const UNDO_MS = 5000;

/** Shows a toast with an Undo button that runs `undo`. */
export function undoToast(message: string, undo: () => void) {
  toast(message, { duration: UNDO_MS, action: { label: "Undo", onClick: undo } });
}
