import { exportTasksCsv } from "@/server/data/export";
import { requireUser } from "@/server/session";

export const dynamic = "force-dynamic";

/** GET /api/export/tasks: every task as a CSV file (CLAUDE.md §6.2). */
export async function GET() {
  const { userId } = await requireUser();
  const csv = await exportTasksCsv(userId);
  const day = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="ledge-tasks-${day}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
