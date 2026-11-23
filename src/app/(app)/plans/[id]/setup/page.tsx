import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { flowDates } from "@/modules/planner/components/flow/flow-dates";
import { SetupFlow } from "@/modules/planner/components/flow/setup-flow";
import { toSetupPlan } from "@/modules/planner/components/flow/types";
import { getPlan } from "@/server/data/plans";
import { getUserSettings } from "@/server/data/settings";
import { requireUser } from "@/server/session";
import { voiceAvailable } from "@/server/voice";
import { z } from "zod";

export const metadata: Metadata = { title: "New plan" };

/**
 * A draft plan's steps, resumed where it was left (docs/plans-module-spec.md §2b). Only drafts
 * live here: a plan that was already added opens its own page.
 */
export default async function PlanSetupPage({ params }: PageProps<"/plans/[id]/setup">) {
  const { userId } = await requireUser();
  const { id } = await params;
  const parsed = z.uuid().safeParse(id);
  if (!parsed.success) notFound();
  const plan = await getPlan(userId, parsed.data);
  if (!plan) notFound(); // someone else's plan looks exactly like a missing one
  if (plan.status !== "draft") redirect(`/plans/${plan.id}`);

  const [settings, voice] = await Promise.all([getUserSettings(userId), voiceAvailable(userId)]);
  return <SetupFlow plan={toSetupPlan(plan)} dates={flowDates(settings)} voice={voice} />;
}
