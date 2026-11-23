import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { flowDates } from "@/modules/planner/components/flow/flow-dates";
import { MoreFlow } from "@/modules/planner/components/flow/more-flow";
import { getPlan } from "@/server/data/plans";
import { getUserSettings } from "@/server/data/settings";
import { requireUser } from "@/server/session";
import { z } from "zod";

export const metadata: Metadata = { title: "More tasks" };

/** Review of the AI's suggested next steps for a plan that is already running. */
export default async function PlanMorePage({ params }: PageProps<"/plans/[id]/more">) {
  const { userId } = await requireUser();
  const { id } = await params;
  const parsed = z.uuid().safeParse(id);
  if (!parsed.success) notFound();
  const plan = await getPlan(userId, parsed.data);
  if (!plan) notFound();
  if (plan.status !== "active" || plan.phases.length === 0) redirect(`/plans/${plan.id}`);

  const settings = await getUserSettings(userId);
  const dates = flowDates(settings);
  const startDate = plan.startDate ?? plan.phases[0].startDate;
  const endDate = plan.endDate ?? plan.phases[plan.phases.length - 1].endDate;
  return (
    <MoreFlow
      planId={plan.id}
      title={plan.title}
      phases={plan.phases}
      startDate={startDate}
      endDate={endDate}
      dates={dates}
    />
  );
}
