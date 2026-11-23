/** The screens of the new-plan flow, in order. */
export type FlowScreen =
  | { name: "goal" }
  | { name: "basics" }
  | { name: "questions"; index: number; total: number }
  | { name: "followups"; index: number; total: number }
  | { name: "making" }
  | { name: "review" };

/** How full the thin bar at the top is (0 to 100). */
export function stepProgress(screen: FlowScreen): number {
  switch (screen.name) {
    case "goal":
      return 10;
    case "basics":
      return 25;
    case "questions":
      return 30 + Math.round((45 * (screen.index + 1)) / Math.max(1, screen.total));
    case "followups":
      return 78;
    case "making":
      return 92;
    case "review":
      return 100;
  }
}

/** The mono label beside the close button. */
export function stepEyebrow(screen: FlowScreen): string {
  switch (screen.name) {
    case "goal":
      return "Step 1 of 4";
    case "basics":
      return "Step 2 of 4";
    case "questions":
      return `Question ${screen.index + 1} of ${screen.total}`;
    case "followups":
      return `Follow-up ${screen.index + 1} of ${screen.total}`;
    case "making":
      return "Making your plan";
    case "review":
      return "Review your plan";
  }
}
