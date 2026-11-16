import { exportEverything } from "@/server/data/export";
import { requireUser } from "@/server/session";

export const dynamic = "force-dynamic";

/** GET /api/export/everything: all of the user's data as one JSON file (CLAUDE.md §6.2). */
export async function GET() {
  const { userId } = await requireUser();
  // Exports include journal pages even while the journal is locked (screen 7f).
  const data = await exportEverything(userId);
  const day = data.exportedAt.slice(0, 10);
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="ledge-export-${day}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
