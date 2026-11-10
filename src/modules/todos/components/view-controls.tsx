"use client";

import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Tag } from "@/server/db/schema";
import {
  DEFAULT_VIEW_SETTINGS,
  DUE_FILTER_LABELS,
  DUE_FILTERS,
  GROUP_LABELS,
  GROUPS,
  SORT_LABELS,
  SORTS,
  type ViewSettings,
} from "../view-settings";
import { PRIORITY_LABELS } from "./types";

const ANY = "any";

/** How many choices differ from the defaults (shown on the button). */
function activeCount(s: ViewSettings, base: ViewSettings): number {
  return [
    s.sort !== base.sort,
    s.group !== base.group,
    s.tagId !== base.tagId,
    s.priority !== base.priority,
    s.hasDue !== base.hasDue,
    s.showCompleted !== base.showCompleted,
  ].filter(Boolean).length;
}

/**
 * Sort, group and filter controls (CLAUDE.md §6.2). Reports every change through `onChange`;
 * the caller decides whether to save it on the list or put it in the URL.
 * `allowManual` is false for views that mix lists, where manual order has no meaning.
 */
export function ViewControls({
  settings,
  base = DEFAULT_VIEW_SETTINGS,
  tags,
  allowManual,
  onChange,
}: {
  settings: ViewSettings;
  /** The settings this view starts with; "Reset" returns to them. */
  base?: ViewSettings;
  tags: Tag[];
  allowManual: boolean;
  onChange: (next: ViewSettings) => void;
}) {
  const count = activeCount(settings, base);
  const sorts = SORTS.filter((s) => allowManual || s !== "manual");
  const set = (patch: Partial<ViewSettings>) => onChange({ ...settings, ...patch });

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" className="h-11 gap-2 md:h-8">
          <SlidersHorizontal aria-hidden />
          View
          {count > 0 ? (
            <span className="rounded-full bg-primary px-1.5 text-xs text-primary-foreground">
              {count}
              <span className="sr-only"> changed</span>
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <div className="flex flex-col gap-3">
          <Field label="Sort by" id="view-sort">
            <Select
              value={settings.sort}
              onValueChange={(v) => set({ sort: v as ViewSettings["sort"] })}
            >
              <SelectTrigger id="view-sort" className="h-11 w-full md:h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {sorts.map((s) => (
                  <SelectItem key={s} value={s}>
                    {SORT_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Group by" id="view-group">
            <Select
              value={settings.group}
              onValueChange={(v) => set({ group: v as ViewSettings["group"] })}
            >
              <SelectTrigger id="view-group" className="h-11 w-full md:h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {GROUPS.map((g) => (
                  <SelectItem key={g} value={g}>
                    {GROUP_LABELS[g]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <p className="text-sm font-medium">Show only</p>

          <Field label="Tag" id="view-tag">
            <Select
              value={settings.tagId ?? ANY}
              onValueChange={(v) => set({ tagId: v === ANY ? null : v })}
            >
              <SelectTrigger id="view-tag" className="h-11 w-full md:h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY}>Any tag</SelectItem>
                {tags.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Priority" id="view-priority">
            <Select
              value={settings.priority === null ? ANY : String(settings.priority)}
              onValueChange={(v) => set({ priority: v === ANY ? null : Number(v) })}
            >
              <SelectTrigger id="view-priority" className="h-11 w-full md:h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY}>Any priority</SelectItem>
                {PRIORITY_LABELS.map((label, i) => (
                  <SelectItem key={label} value={String(i)}>
                    {i === 0 ? "No priority" : label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Due date" id="view-due">
            <Select
              value={settings.hasDue}
              onValueChange={(v) => set({ hasDue: v as ViewSettings["hasDue"] })}
            >
              <SelectTrigger id="view-due" className="h-11 w-full md:h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DUE_FILTERS.map((d) => (
                  <SelectItem key={d} value={d}>
                    {DUE_FILTER_LABELS[d]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <label className="flex min-h-11 items-center gap-2 text-sm md:min-h-8">
            <input
              type="checkbox"
              checked={settings.showCompleted}
              onChange={(e) => set({ showCompleted: e.target.checked })}
              className="size-5 accent-primary md:size-4"
            />
            Show completed tasks
          </label>

          <Button
            type="button"
            variant="ghost"
            className="h-11 justify-start md:h-8"
            disabled={count === 0}
            onClick={() => onChange(base)}
          >
            Reset view
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function Field({ label, id, children }: { label: string; id: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}
