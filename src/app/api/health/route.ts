import { pingDb } from "@/server/db/client";

// Never cached: a health check that answers from a cache says nothing about the database.
export const dynamic = "force-dynamic";

/**
 * Health check for Docker and monitoring (CLAUDE.md §12). 200 only when the database answers a
 * trivial query. It reveals nothing about the cause of a failure; the server log has that.
 */
export async function GET() {
  const headers = { "Cache-Control": "no-store" };
  try {
    await pingDb();
    return Response.json({ status: "ok" }, { headers });
  } catch (error) {
    console.error("health check: database unreachable", error);
    return Response.json({ status: "unavailable" }, { status: 503, headers });
  }
}
