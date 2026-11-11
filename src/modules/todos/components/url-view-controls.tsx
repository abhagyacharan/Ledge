"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { settingsToSearchParams, type ViewSettings } from "../view-settings";
import { ViewControls } from "./view-controls";

/**
 * View controls for screens that mix lists (All): the choices live in the URL, so a view can
 * be bookmarked or shared. Opening a task keeps them (`?task=` is preserved).
 */
export function UrlViewControls({
  settings,
  base,
}: {
  settings: ViewSettings;
  base: ViewSettings;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const current = useSearchParams();

  function onChange(next: ViewSettings) {
    const params = settingsToSearchParams(next, base);
    const task = current.get("task");
    if (task) params.set("task", task);
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  return <ViewControls settings={settings} base={base} allowManual={false} onChange={onChange} />;
}
