import type { NextRequest } from "next/server";
import { breakdownQuery, breakdownReport, pdfResponse } from "@/modules/expenses/reports";
import { requireUser } from "@/server/session";

export const dynamic = "force-dynamic";

/** GET /api/export/expense-breakdown?y=2026&m=11 (or m=all): the expense breakdown as a PDF. */
export async function GET(request: NextRequest) {
  const { userId } = await requireUser();
  const parsed = breakdownQuery.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) {
    return Response.json({ error: "Choose a month (1 to 12) or the whole year." }, { status: 400 });
  }
  return pdfResponse(await breakdownReport(userId, { year: parsed.data.y, month: parsed.data.m }));
}
