import { redirect } from "next/navigation";

/** The one-page planner became the Plans module (docs/plans-module-spec.md): old links keep working. */
export default function PlanPage() {
  redirect("/plans/new");
}
