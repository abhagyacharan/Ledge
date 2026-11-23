"use client";

import { useRouter } from "next/navigation";
import { startPlanAction } from "../../actions";
import { call, problemOf } from "./call";
import { GoalStep } from "./goal-step";

/** `/plans/new`: step 1 only. The draft exists once the goal is saved, then setup takes over. */
export function NewPlanFlow({ voice }: { voice: boolean }) {
  const router = useRouter();
  return (
    <GoalStep
      initial=""
      warnOnChange={false}
      voice={voice}
      onClose={() => router.push("/plans")}
      onSubmit={async (goal) => {
        const result = await call(startPlanAction({ goal }));
        if (!result.ok) return problemOf(result);
        router.push(`/plans/${result.data.planId}/setup`);
        // Stay busy until the next page arrives.
        return null;
      }}
    />
  );
}
