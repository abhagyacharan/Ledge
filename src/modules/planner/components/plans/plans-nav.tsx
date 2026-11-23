"use client";

import { createContext, useContext, type ReactNode } from "react";

/** The user's active plans for the shell (the command palette lists them by name). */
export type PlanLink = { id: string; title: string };

const PlansNavContext = createContext<PlanLink[]>([]);

/** Gives the command palette the active plans, loaded once in the app layout. */
export function PlansNavProvider({ plans, children }: { plans: PlanLink[]; children: ReactNode }) {
  return <PlansNavContext.Provider value={plans}>{children}</PlansNavContext.Provider>;
}

export function useActivePlans(): PlanLink[] {
  return useContext(PlansNavContext);
}
