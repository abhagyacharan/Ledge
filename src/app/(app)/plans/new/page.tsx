import type { Metadata } from "next";
import Link from "next/link";
import { NewPlanFlow } from "@/modules/planner/components/flow/new-plan-flow";
import { plannerAvailable } from "@/server/planner";
import { requireUser } from "@/server/session";
import { voiceAvailable } from "@/server/voice";

export const metadata: Metadata = { title: "New plan" };

/** Step 1 of a new plan: the goal. The draft is created when Next is pressed. */
export default async function NewPlanPage() {
  const { userId } = await requireUser();
  if (!plannerAvailable()) {
    return (
      <div className="dash mx-auto flex w-full max-w-xl flex-col items-center gap-3 rounded-3xl bg-dash-card px-6 py-10 text-center ring-1 ring-dash-edge">
        <h1 className="font-display text-2xl font-semibold text-dash-ink">
          Planning is switched off
        </h1>
        <p className="text-sm text-dash-ink-soft">
          Ledge needs its AI key to make plans. Add <code className="font-mono">GROQ_API_KEY</code>{" "}
          to the server settings and try again.
        </p>
        <Link
          href="/plans"
          className="mt-2 inline-flex h-11 items-center rounded-full bg-dash-well px-5 text-sm font-semibold text-dash-ink hover:bg-dash-edge"
        >
          Back to Plans
        </Link>
      </div>
    );
  }
  const voice = await voiceAvailable(userId);
  return <NewPlanFlow voice={voice} />;
}
