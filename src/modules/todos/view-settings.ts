import { z } from "zod";

/**
 * How a list of tasks is sorted, grouped and filtered (CLAUDE.md §6.2). For lists this is saved in
 * `lists.view_settings`; for the All and Tag views it lives in the URL.
 */

export const SORTS = ["manual", "due", "priority", "created"] as const;
export const GROUPS = ["none", "due", "priority", "tag"] as const;
export const DUE_FILTERS = ["any", "yes", "no"] as const;

export type Sort = (typeof SORTS)[number];
export type Group = (typeof GROUPS)[number];
export type DueFilter = (typeof DUE_FILTERS)[number];

export const SORT_LABELS: Record<Sort, string> = {
  manual: "Manual",
  due: "Due date",
  priority: "Priority",
  created: "Newest first",
};
export const GROUP_LABELS: Record<Group, string> = {
  none: "No grouping",
  due: "Due date",
  priority: "Priority",
  tag: "Tag",
};
export const DUE_FILTER_LABELS: Record<DueFilter, string> = {
  any: "Any",
  yes: "Has a due date",
  no: "No due date",
};

export const viewSettingsSchema = z.object({
  sort: z.enum(SORTS).default("manual"),
  group: z.enum(GROUPS).default("none"),
  /** Only tasks with this tag. */
  tagId: z.uuid().nullable().default(null),
  /** Only tasks with exactly this priority (0 to 3). */
  priority: z.number().int().min(0).max(3).nullable().default(null),
  hasDue: z.enum(DUE_FILTERS).default("any"),
  showCompleted: z.boolean().default(false),
});

export type ViewSettings = z.infer<typeof viewSettingsSchema>;

export const DEFAULT_VIEW_SETTINGS: ViewSettings = viewSettingsSchema.parse({});

/** Reads saved settings, falling back to the defaults for anything missing or invalid. */
export function parseViewSettings(raw: unknown): ViewSettings {
  const parsed = viewSettingsSchema.safeParse(raw);
  return parsed.success ? parsed.data : DEFAULT_VIEW_SETTINGS;
}

export function isDefaultView(settings: ViewSettings, ignoreSort = false): boolean {
  const d = DEFAULT_VIEW_SETTINGS;
  return (
    (ignoreSort || settings.sort === d.sort) &&
    settings.group === d.group &&
    settings.tagId === d.tagId &&
    settings.priority === d.priority &&
    settings.hasDue === d.hasDue &&
    settings.showCompleted === d.showCompleted
  );
}

type Params = Record<string, string | string[] | undefined>;

/** Reads view settings from URL search params (`?sort=due&group=tag&tag=<id>&done=1`). */
export function settingsFromSearchParams(params: Params, fallback: ViewSettings): ViewSettings {
  const one = (key: string) => (Array.isArray(params[key]) ? params[key][0] : params[key]);
  const priority = one("priority");
  const raw = {
    sort: one("sort") ?? fallback.sort,
    group: one("group") ?? fallback.group,
    tagId: one("tag") ?? fallback.tagId,
    priority: priority === undefined ? fallback.priority : Number(priority),
    hasDue: one("due") ?? fallback.hasDue,
    showCompleted: one("done") === undefined ? fallback.showCompleted : one("done") === "1",
  };
  const parsed = viewSettingsSchema.safeParse(raw);
  return parsed.success ? parsed.data : fallback;
}

/** Turns settings into URL params, leaving out anything that equals the default. */
export function settingsToSearchParams(
  settings: ViewSettings,
  base: ViewSettings,
): URLSearchParams {
  const p = new URLSearchParams();
  if (settings.sort !== base.sort) p.set("sort", settings.sort);
  if (settings.group !== base.group) p.set("group", settings.group);
  if (settings.tagId !== base.tagId && settings.tagId) p.set("tag", settings.tagId);
  if (settings.priority !== base.priority && settings.priority !== null) {
    p.set("priority", String(settings.priority));
  }
  if (settings.hasDue !== base.hasDue) p.set("due", settings.hasDue);
  if (settings.showCompleted !== base.showCompleted)
    p.set("done", settings.showCompleted ? "1" : "0");
  return p;
}
