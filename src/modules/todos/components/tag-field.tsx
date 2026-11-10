"use client";

import { Check, Plus, Tag as TagIcon } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { Tag } from "@/server/db/schema";
import { createTagAction } from "../actions/tags";
import { run } from "./run-action";
import { TagChip } from "./task-row";

/**
 * Tags on a task: toggle existing tags, or type a new name to create one inline
 * (CLAUDE.md §6.2). Names are unique ignoring case, so typing "Home" picks up "home".
 */
export function TagField({
  allTags,
  selectedIds,
  onChange,
}: {
  allTags: Tag[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const [query, setQuery] = useState("");
  const [pending, startTransition] = useTransition();
  const selected = allTags.filter((t) => selectedIds.includes(t.id));
  const trimmed = query.trim();
  const matches = allTags.filter((t) => t.name.toLowerCase().includes(trimmed.toLowerCase()));
  const exact = allTags.some((t) => t.name.toLowerCase() === trimmed.toLowerCase());

  function toggle(id: string) {
    onChange(selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id]);
  }

  function create() {
    startTransition(async () => {
      const result = await run(createTagAction({ name: trimmed }));
      if (!result.ok) return;
      setQuery("");
      if (!selectedIds.includes(result.data.id)) onChange([...selectedIds, result.data.id]);
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {selected.map((t) => (
        <TagChip key={t.id} name={t.name} color={t.color} />
      ))}
      <Popover>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" className="h-11 gap-1 md:h-8">
            <TagIcon aria-hidden /> {selected.length > 0 ? "Edit tags" : "Add tags"}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-72">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && trimmed && !exact && !pending) {
                e.preventDefault();
                create();
              }
            }}
            placeholder="Find or create a tag"
            aria-label="Find or create a tag"
            maxLength={50}
            className="h-11 md:h-8"
          />
          <ul className="mt-2 max-h-56 overflow-y-auto" aria-label="Tags">
            {matches.map((t) => {
              const on = selectedIds.includes(t.id);
              return (
                <li key={t.id}>
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={on}
                    onClick={() => toggle(t.id)}
                    className="flex min-h-11 w-full items-center gap-2 rounded-md px-2 text-left text-sm outline-none hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50 md:min-h-8"
                  >
                    <span
                      aria-hidden
                      className="size-2.5 shrink-0 rounded-full bg-muted-foreground/50"
                      style={t.color ? { backgroundColor: t.color } : undefined}
                    />
                    <span className="flex-1 truncate">{t.name}</span>
                    {on ? <Check className="size-4" aria-label="Selected" /> : null}
                  </button>
                </li>
              );
            })}
          </ul>
          {trimmed && !exact ? (
            <Button
              type="button"
              variant="ghost"
              className="mt-1 h-11 w-full justify-start gap-1 md:h-8"
              disabled={pending}
              onClick={create}
            >
              <Plus /> Create &ldquo;{trimmed}&rdquo;
            </Button>
          ) : null}
          {allTags.length === 0 && !trimmed ? (
            <p className="px-2 py-1 text-sm text-muted-foreground">
              No tags yet. Type a name to create one.
            </p>
          ) : null}
        </PopoverContent>
      </Popover>
    </div>
  );
}
