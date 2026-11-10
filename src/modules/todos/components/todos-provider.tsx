"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { List, Tag } from "@/server/db/schema";

type TodosData = {
  /** Lists for the sidebar and quick add: not archived, not in Trash, Inbox first. */
  lists: List[];
  inboxId: string;
  /** All of the user's tags, alphabetical. */
  tags: Tag[];
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
