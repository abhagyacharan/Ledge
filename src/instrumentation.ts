/**
 * Runs once when a Next.js server starts (node_modules/next/dist/docs, instrumentation). Starts the
 * reminder scheduler (docs/reminders-spec.md §9) in the Node.js runtime only, when Web Push is
 * configured, and never during `next build` or under Vitest (tests call the tick directly).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    if (process.env.VITEST || process.env.NEXT_PHASE === "phase-production-build") return;
    const { pushConfigured } = await import("@/server/push");
    if (!pushConfigured()) return;
    const { startReminderScheduler } = await import("@/server/reminders");
    startReminderScheduler();
  }
}
