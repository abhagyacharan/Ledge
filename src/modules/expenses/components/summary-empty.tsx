"use client";

import { Plus, Wallet } from "lucide-react";
import { DashButton } from "@/components/dash/dash-button";
import { useLogTransaction } from "./transaction-launcher";

/** The Summary when a period has nothing in it: one sentence, one action (start with income). */
export function SummaryEmpty({ periodLabel }: { periodLabel: string }) {
  const { open } = useLogTransaction();
  return (
    <div className="flex flex-col gap-4 rounded-3xl border border-dashed border-dash-edge bg-dash-card p-5 sm:flex-row sm:items-center md:p-6">
      <span
        aria-hidden
        className="grid size-11 shrink-0 place-items-center rounded-full bg-dash-well text-dash-ink-soft"
      >
        <Wallet className="size-5" strokeWidth={1.75} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-medium">Nothing recorded for {periodLabel} yet</p>
        <p className="text-sm text-dash-ink-soft">
          Start with your income, or use the round + button to log anything.
        </p>
      </div>
      <DashButton onClick={() => open("income")}>
        <Plus />
        Add income
      </DashButton>
    </div>
  );
}
