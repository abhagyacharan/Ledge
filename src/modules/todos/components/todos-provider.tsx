"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { List } from "@/server/db/schema";

type TodosData = {
  /** Lists for the sidebar and quick add: not archived, not in Trash, General (the default) first. */
  lists: List[];
  /** The default list ("General"; stored as the inbox), where tasks go when no list is chosen. */
  inboxId: string;
  /** The user's timezone and locale, so the browser can work out "today" the way the server does. */
  timeZone: string;
  locale: string;
  weekStartsOn: number;
};

const TodosContext = createContext<TodosData | null>(null);

/** Gives the todos sidebar section and quick add the user's lists, loaded once in the layout. */
export function TodosProvider({ value, children }: { value: TodosData; children: ReactNode }) {
  return <TodosContext.Provider value={value}>{children}</TodosContext.Provider>;
}

export function useTodos(): TodosData {
  const value = useContext(TodosContext);
  if (!value) throw new Error("useTodos must be used inside <TodosProvider>");
  return value;
}
