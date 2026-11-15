"use client";

import {
  ArrowUpDown,
  Calendar,
  ChevronDown,
  Eye,
  EyeOff,
  Filter,
  Rows3,
  type LucideIcon,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
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

/** How many choices differ from the defaults. */
function activeCount(s: ViewSettings, base: ViewSettings): number {
  return [
    s.sort !== base.sort,
    s.group !== base.group,
    s.priority !== base.priority,
    s.hasDue !== base.hasDue,
    s.showCompleted !== base.showCompleted,
  ].filter(Boolean).length;
}

const chip =
  "inline-flex h-11 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-medium whitespace-nowrap outline-none transition-[background-color,color,transform] duration-150 ease-snap focus-visible:shadow-[0_0_0_2px_var(--background),0_0_0_4px_var(--dash-ink)] active:scale-[0.97] md:h-9 [&_svg]:size-3.5 [&_svg]:shrink-0";
const quiet = "border-dash-edge bg-dash-card text-dash-ink hover:bg-dash-well";
const changed = "border-dash-ink bg-dash-well text-dash-ink";

/**
 * Sort, group and filter as a row of chips (docs/new_design.md screen 2h, CLAUDE.md §6.2): each
 * chip says its current choice ("Sort: Manual") and opens a short menu; the completed chip is a
 * toggle. A chip that differs from the view's defaults gets an ink outline. Reports every change
 * through `onChange`; the caller saves it on the list or puts it in the URL.
 * `allowManual` is false for views that mix lists, where manual order has no meaning.
 */
export function ViewControls({
  settings,
  base = DEFAULT_VIEW_SETTINGS,
  allowManual,
  onChange,
  savedNote,
}: {
  settings: ViewSettings;
  /** The settings this view starts with; "Reset" returns to them. */
  base?: ViewSettings;
  allowManual: boolean;
  onChange: (next: ViewSettings) => void;
  /** A quiet note at the end of the row, such as "Saved for this list". */
  savedNote?: string;
}) {
  const count = activeCount(settings, base);
  const sorts = SORTS.filter((s) => allowManual || s !== "manual");
  const set = (patch: Partial<ViewSettings>) => onChange({ ...settings, ...patch });

  return (
    <div role="group" aria-label="View" className="flex flex-wrap items-center gap-2">
      <ChipMenu
        icon={ArrowUpDown}
        label="Sort by"
        value={settings.sort}
        shown={SORT_LABELS[settings.sort]}
        options={sorts.map((s) => ({ value: s, label: SORT_LABELS[s] }))}
        changed={settings.sort !== base.sort}
        onPick={(v) => set({ sort: v as ViewSettings["sort"] })}
        prefix="Sort"
      />
      <ChipMenu
        icon={Rows3}
        label="Group by"
        value={settings.group}
        shown={settings.group === "none" ? "None" : GROUP_LABELS[settings.group]}
        options={GROUPS.map((g) => ({ value: g, label: GROUP_LABELS[g] }))}
        changed={settings.group !== base.group}
        onPick={(v) => set({ group: v as ViewSettings["group"] })}
        prefix="Group"
      />
      <ChipMenu
        icon={Filter}
        label="Priority"
        value={settings.priority === null ? ANY : String(settings.priority)}
        shown={settings.priority === null ? "Any" : (PRIORITY_LABELS[settings.priority] ?? "Any")}
        options={[
          { value: ANY, label: "Any priority" },
          ...PRIORITY_LABELS.map((label, i) => ({
            value: String(i),
            label: i === 0 ? "No priority" : label,
          })),
        ]}
        changed={settings.priority !== base.priority}
        onPick={(v) => set({ priority: v === ANY ? null : Number(v) })}
        prefix="Priority"
      />
      <ChipMenu
        icon={Calendar}
        label="Due date"
        value={settings.hasDue}
        shown={settings.hasDue === "any" ? "Any date" : DUE_FILTER_LABELS[settings.hasDue]}
        options={DUE_FILTERS.map((d) => ({
          value: d,
          label: d === "any" ? "Any date" : DUE_FILTER_LABELS[d],
        }))}
        changed={settings.hasDue !== base.hasDue}
        onPick={(v) => set({ hasDue: v as ViewSettings["hasDue"] })}
      />
      <button
        type="button"
        aria-pressed={settings.showCompleted}
        onClick={() => set({ showCompleted: !settings.showCompleted })}
        className={cn(chip, settings.showCompleted !== base.showCompleted ? changed : quiet)}
      >
        {settings.showCompleted ? <Eye aria-hidden /> : <EyeOff aria-hidden />}
        {settings.showCompleted ? "Completed shown" : "Completed hidden"}
      </button>
      {count > 0 ? (
        <button
          type="button"
          onClick={() => onChange(base)}
          className="inline-flex h-11 items-center rounded-full px-3 text-[13px] font-medium text-dash-ink-soft outline-none hover:text-dash-ink focus-visible:ring-3 focus-visible:ring-ring/50 md:h-9"
        >
          Reset
        </button>
      ) : null}
      {savedNote ? (
        <span className="ml-auto hidden text-xs text-dash-ink-soft md:inline">{savedNote}</span>
      ) : null}
    </div>
  );
}

function ChipMenu({
  icon: Icon,
  label,
  prefix,
  value,
  shown,
  options,
  changed: isChanged,
  onPick,
}: {
  icon: LucideIcon;
  /** What the menu chooses, for its heading and the chip's accessible name. */
  label: string;
  /** Short word before the value on the chip ("Sort: Manual"); none shows the value alone. */
  prefix?: string;
  value: string;
  shown: string;
  options: { value: string; label: string }[];
  changed: boolean;
  onPick: (value: string) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`${label}: ${shown}`}
        className={cn(chip, isChanged ? changed : quiet)}
      >
        <Icon aria-hidden />
        {prefix ? `${prefix}: ${shown}` : shown}
        <ChevronDown aria-hidden className="text-dash-ink-soft" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="dash w-52 rounded-2xl p-1.5">
        <DropdownMenuLabel className="text-xs text-dash-ink-soft">{label}</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={value} onValueChange={onPick}>
          {options.map((o) => (
            <DropdownMenuRadioItem key={o.value} value={o.value} className="min-h-11 md:min-h-8">
              {o.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
