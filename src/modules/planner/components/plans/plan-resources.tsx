"use client";

import {
  BookOpen,
  Check,
  ChevronDown,
  CirclePlay,
  ExternalLink,
  GraduationCap,
  Library,
  Newspaper,
  Plus,
  Search,
  Users,
  Wrench,
  X,
  type LucideIcon,
} from "lucide-react";
import { useId, useState, useTransition } from "react";
import { dashButton } from "@/components/dash/dash-button";
import { useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";
import { run } from "@/modules/todos/components/run-action";
import { updateResourcesAction } from "../../actions";
import { resourceSearchUrl } from "../../resources";
import {
  RESOURCE_KINDS,
  RESOURCE_KIND_LABELS,
  planResourceSchema,
  type PlanResource,
  type ResourceKind,
} from "../../schema";

const KIND_ICONS: Record<ResourceKind, LucideIcon> = {
  book: BookOpen,
  course: GraduationCap,
  video: CirclePlay,
  community: Users,
  tool: Wrench,
  article: Newspaper,
};

const MAX_RESOURCES = 20;

const smallButton =
  "inline-flex h-9 items-center gap-1.5 rounded-full bg-dash-well px-3 text-[13px] font-medium text-dash-ink outline-none transition-colors duration-150 hover:bg-dash-edge focus-visible:ring-3 focus-visible:ring-ring/50 [&_svg]:size-3.5";

/** "a book, a course and a channel", for the collapsed summary on a wide screen. */
function summarise(resources: PlanResource[]): string {
  const words: Record<ResourceKind, string> = {
    book: "a book",
    course: "a course",
    video: "a channel",
    community: "a community",
    tool: "a tool",
    article: "an article",
  };
  const kinds = RESOURCE_KINDS.filter((k) => resources.some((r) => r.kind === k));
  return kinds.map((k) => words[k]).join(", ");
}

/**
 * The plan's resources (docs/plans designs 8j, 8k): suggestions with no links on purpose. The
 * model never writes a web address, so Search opens a search for the name (YouTube for a channel).
 * You can tick one as used, remove it, or add your own with an optional pasted http(s) link, which
 * is the only link ever shown. With a mouse the card starts folded; on a phone it starts open.
 */
export function PlanResources({
  planId,
  resources: saved,
}: {
  planId: string;
  resources: PlanResource[];
}) {
  const desktop = useMediaQuery("(min-width: 768px)");
  const [choice, setChoice] = useState<boolean | null>(null);
  const open = choice ?? !desktop;
  const [resources, setResources] = useState(saved);
  const [seen, setSeen] = useState(saved);
  if (saved !== seen) {
    setSeen(saved);
    setResources(saved);
  }
  const [adding, setAdding] = useState(false);
  const [, startTransition] = useTransition();
  const panelId = useId();

  function save(next: PlanResource[]) {
    const before = resources;
    setResources(next);
    startTransition(async () => {
      const result = await run(updateResourcesAction({ planId, resources: next }));
      if (!result.ok) setResources(before);
    });
  }

  const unused = resources.filter((r) => !r.used).length;

  return (
    <section
      aria-labelledby={`${panelId}-title`}
      className={cn(
        "flex min-w-0 flex-col rounded-2xl border border-dash-edge bg-dash-card text-dash-ink shadow-(--dash-card-shadow)",
        !open && "[&>button]:flex-1",
        open && "md:col-span-2",
      )}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setChoice(!open)}
        className="flex min-h-[76px] w-full items-center gap-3 rounded-2xl px-4 py-3 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <span
          aria-hidden
          className="grid size-10 shrink-0 place-items-center rounded-full bg-dash-well"
        >
          <Library className="size-[18px]" strokeWidth={1.75} />
        </span>
        <span className="min-w-0 flex-1">
          <span id={`${panelId}-title`} className="block text-[15px] font-semibold">
            Resources
          </span>
          <span className="mt-0.5 block text-[13px] leading-snug text-dash-ink-soft">
            {resources.length === 0
              ? "Nothing suggested yet. Add your own."
              : open
                ? `${resources.length} ${resources.length === 1 ? "suggestion" : "suggested"}${unused < resources.length ? `, ${resources.length - unused} used` : ""}`
                : `${resources.length} suggested: ${summarise(resources)}`}
          </span>
        </span>
        <ChevronDown
          aria-hidden
          className={cn(
            "size-4 shrink-0 text-dash-ink-soft transition-transform duration-200 ease-snap",
            open && "rotate-180",
          )}
        />
      </button>

      {open ? (
        <div id={panelId} className="px-4 pb-3">
          <ul>
            {resources.map((r) => {
              const Icon = KIND_ICONS[r.kind];
              return (
                <li
                  key={r.id}
                  className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-dash-edge py-3"
                >
                  <span
                    aria-hidden
                    className="grid size-9 shrink-0 place-items-center rounded-full bg-dash-well"
                  >
                    <Icon className="size-4" strokeWidth={1.75} />
                  </span>
                  <div className="min-w-0 flex-1 basis-48">
                    <p
                      className={cn(
                        "text-sm font-semibold break-words",
                        r.used && "text-dash-ink-soft line-through",
                      )}
                    >
                      {r.name}
                    </p>
                    <p className="mt-0.5 text-xs leading-snug text-dash-ink-soft">
                      <span className="font-mono">{RESOURCE_KIND_LABELS[r.kind]}</span>
                      {r.why ? ` · ${r.why}` : ""}
                    </p>
                  </div>
                  <div className="flex w-full flex-wrap items-center gap-1.5 pl-12 md:w-auto md:pl-0">
                    {r.url ? (
                      <a
                        href={r.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Open ${r.name} (opens in a new tab)`}
                        className={smallButton}
                      >
                        <ExternalLink aria-hidden /> Open
                      </a>
                    ) : null}
                    <a
                      href={resourceSearchUrl(r)}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Search for ${r.name} (opens in a new tab)`}
                      className={smallButton}
                    >
                      <Search aria-hidden /> Search
                    </a>
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={r.used}
                      aria-label={`${r.name}: mark as ${r.used ? "not used" : "used"}`}
                      onClick={() =>
                        save(resources.map((x) => (x.id === r.id ? { ...x, used: !x.used } : x)))
                      }
                      className={cn(
                        smallButton,
                        r.used && "bg-dash-ink text-dash-card hover:bg-dash-ink/85",
                      )}
                    >
                      <Check aria-hidden strokeWidth={2.5} />
                      {r.used ? "Used" : "Mark used"}
                    </button>
                    <button
                      type="button"
                      aria-label={`Remove ${r.name}`}
                      onClick={() => save(resources.filter((x) => x.id !== r.id))}
                      className="grid size-9 place-items-center rounded-full text-dash-ink-soft outline-none transition-colors duration-150 hover:bg-dash-well hover:text-dash-ink focus-visible:ring-3 focus-visible:ring-ring/50"
                    >
                      <X aria-hidden className="size-4" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>

          {adding ? (
            <AddResource
              onAdd={(resource) => {
                save([...resources, resource]);
                setAdding(false);
              }}
              onCancel={() => setAdding(false)}
            />
          ) : resources.length < MAX_RESOURCES ? (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="mt-1 flex min-h-11 w-full items-center gap-3 rounded-xl px-1 text-[14px] font-medium text-dash-ink-soft outline-none transition-colors duration-150 hover:text-dash-ink focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <Plus aria-hidden className="size-4" /> Add your own
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function AddResource({
  onAdd,
  onCancel,
}: {
  onAdd: (resource: PlanResource) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [kind, setKind] = useState<ResourceKind>("article");
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const id = useId();

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const parsed = planResourceSchema.safeParse({
      id: `r${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`,
      name,
      kind,
      why: "Added by you",
      used: false,
      url: url.trim() === "" ? null : url.trim(),
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check the name and the link.");
      return;
    }
    onAdd(parsed.data);
  }

  const field =
    "h-11 w-full rounded-xl bg-dash-well px-3 text-base outline-none placeholder:text-dash-ink-soft focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm";

  return (
    <form onSubmit={submit} className="mt-2 flex flex-col gap-2.5 border-t border-dash-edge pt-3">
      <div>
        <label htmlFor={`${id}-name`} className="mb-1 block text-xs font-medium text-dash-ink-soft">
          Name
        </label>
        <input
          id={`${id}-name`}
          value={name}
          maxLength={80}
          onChange={(e) => {
            setName(e.target.value);
            setError(null);
          }}
          placeholder="A book, a channel, a tool..."
          className={field}
          autoComplete="off"
        />
      </div>
      <fieldset>
        <legend className="mb-1 text-xs font-medium text-dash-ink-soft">Kind</legend>
        <div className="flex flex-wrap gap-1.5">
          {RESOURCE_KINDS.map((k) => (
            <button
              key={k}
              type="button"
              aria-pressed={kind === k}
              onClick={() => setKind(k)}
              className={cn(
                "inline-flex h-9 items-center gap-1 rounded-full px-3 text-[13px] font-medium outline-none transition-colors duration-150 focus-visible:ring-3 focus-visible:ring-ring/50",
                kind === k
                  ? "bg-dash-ink text-dash-card"
                  : "bg-dash-well text-dash-ink-soft hover:text-dash-ink",
              )}
            >
              {kind === k ? <Check aria-hidden className="size-3.5" strokeWidth={2.5} /> : null}
              {RESOURCE_KIND_LABELS[k]}
            </button>
          ))}
        </div>
      </fieldset>
      <div>
        <label htmlFor={`${id}-url`} className="mb-1 block text-xs font-medium text-dash-ink-soft">
          Link (optional)
        </label>
        <input
          id={`${id}-url`}
          value={url}
          inputMode="url"
          onChange={(e) => {
            setUrl(e.target.value);
            setError(null);
          }}
          placeholder="https://"
          className={cn(field, "font-mono")}
          autoComplete="off"
        />
      </div>
      {error ? (
        <p role="alert" className="text-sm text-dash-bad">
          {error}
        </p>
      ) : null}
      <div className="flex gap-2">
        <button type="submit" className={cn(dashButton(), "h-11 md:h-10")}>
          Add resource
        </button>
        <button
          type="button"
          onClick={onCancel}
          className={cn(dashButton({ variant: "ghost" }), "h-11 md:h-10")}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
