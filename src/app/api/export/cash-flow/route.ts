import type { NextRequest } from "next/server";
import { cashFlowQuery, cashFlowReport, pdfResponse } from "@/modules/expenses/reports";
import { requireUser } from "@/server/session";

export const dynamic = "force-dynamic";

/** GET /api/export/cash-flow?y=2026: the annual cash flow trend for a year as a PDF. */
export async function GET(request: NextRequest) {
  const { userId } = await requireUser();
  const parsed = cashFlowQuery.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) {
    return Response.json({ error: "Choose a year." }, { status: 400 });
  }
  return pdfResponse(await cashFlowReport(userId, parsed.data.y));
}
