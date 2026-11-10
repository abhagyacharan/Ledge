"use client";

import { usePathname, useSearchParams } from "next/navigation";

/**
 * Links that open or close the task drawer (`?task=<id>`) while keeping the rest of the query
 * string, so the view's sort, group and filter choices in the URL survive opening a task.
 */
export function useTaskLinks() {
  const pathname = usePathname();
  const search = useSearchParams();

  function withTask(id: string | null): string {
    const params = new URLSearchParams(search.toString());
    if (id) params.set("task", id);
    else params.delete("task");
    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  }

  return { hrefFor: (id: string) => withTask(id), closeHref: withTask(null) };
}
