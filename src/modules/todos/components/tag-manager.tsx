"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Tag } from "@/server/db/schema";
import { deleteTagAction, updateTagAction } from "../actions/tags";
import { ColorPicker } from "./color-picker";
import { ConfirmDialog } from "./confirm-dialog";
import { run } from "./run-action";

/** Rename, recolor and delete tags (CLAUDE.md §6.2). New tags are created while editing a task. */
export function TagManager({ tags }: { tags: Tag[] }) {
  if (tags.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No tags yet. Create one from any task: open it and choose &ldquo;Add tags&rdquo;.
      </p>
    );
  }
  return (
    <ul className="divide-y">
      {tags.map((tag) => (
        <TagItem key={tag.id} tag={tag} />
      ))}
    </ul>
  );
}

function TagItem({ tag }: { tag: Tag }) {
  const [name, setName] = useState(tag.name);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  async function saveName() {
    const next = name.trim();
    if (next === tag.name) return;
    if (!next) {
      setName(tag.name);
      setError("A tag needs a name.");
      return;
    }
    const result = await run(updateTagAction({ id: tag.id, name: next }));
    if (result.ok) setError(null);
    else {
      setError(result.fieldErrors?.name ?? "Couldn't rename this tag.");
      setName(tag.name);
    }
  }

  return (
    <li className="flex flex-col gap-3 py-3">
      <div className="flex items-end gap-2">
        <div className="flex flex-1 flex-col gap-2">
          <Label htmlFor={`tag-name-${tag.id}`}>Tag name</Label>
          <Input
            id={`tag-name-${tag.id}`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => void saveName()}
            onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
            maxLength={50}
            aria-invalid={error ? true : undefined}
            className="h-11 md:h-8"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-11 text-destructive md:size-8"
          aria-label={`Delete tag ${tag.name}`}
          onClick={() => setConfirming(true)}
        >
          <Trash2 />
        </Button>
      </div>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <ColorPicker
        value={tag.color}
        label={`Colour for ${tag.name}`}
        onChange={(color) => void run(updateTagAction({ id: tag.id, color }))}
      />
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={`Delete tag "${tag.name}"?`}
        description="It is removed from every task that has it. The tasks themselves are not deleted."
        confirmLabel="Delete tag"
        onConfirm={() => void run(deleteTagAction({ id: tag.id }))}
      />
    </li>
  );
}
