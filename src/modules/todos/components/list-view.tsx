"use client";

import { ChevronDown, ChevronRight, Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { List, Section } from "@/server/db/schema";
import type { TaskRow as TaskRowData } from "@/server/data/tasks";
import { createSectionAction } from "../actions/sections";
import { InlineAdd } from "./inline-add";
import { ListHeader } from "./list-header";
import { NameDialog } from "./name-dialog";
import { run } from "./run-action";
import { SectionBlock } from "./section-block";
import { TaskRow } from "./task-row";
import type { DateContext, TagsById } from "./types";

type Props = {
  list: List;
  sections: Section[];
  tasks: TaskRowData[];
  tagsById: TagsById;
  ctx: DateContext;
};

/** A list screen: header, tasks grouped by section, inline add, completed tasks. */
export function ListView({ list, sections, tasks, tagsById, ctx }: Props) {
  const [showDone, setShowDone] = useState(false);
  const [addingSection, setAddingSection] = useState(false);

  const topLevel = tasks.filter((t) => !t.parentId);
  const subtasksOf = (id: string) => tasks.filter((t) => t.parentId === id);
  const open = topLevel.filter((t) => t.status === "open");
  const done = topLevel.filter((t) => t.status === "done");
  const unsectioned = open.filter((t) => !t.sectionId);

  const rows = (items: TaskRowData[]) => (
    <ul>
      {items.map((t) => (
        <TaskRow key={t.id} task={t} subtasks={subtasksOf(t.id)} tagsById={tagsById} ctx={ctx} />
      ))}
    </ul>
  );

  return (
    <div>
      <ListHeader list={list} taskCount={topLevel.length} ctx={ctx} />

      {open.length === 0 && done.length === 0 && sections.length === 0 ? (
        <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
          No tasks yet. Type one below and press Enter.
        </p>
      ) : null}

      {unsectioned.length > 0 ? rows(unsectioned) : null}
      <InlineAdd listId={list.id} />

      {sections.map((section) => {
        const inSection = open.filter((t) => t.sectionId === section.id);
        return (
          <SectionBlock key={section.id} section={section} count={inSection.length}>
            {rows(inSection)}
            <InlineAdd listId={list.id} sectionId={section.id} label={`Add to ${section.name}`} />
          </SectionBlock>
        );
      })}

      <div className="mt-6">
        <Button
          variant="ghost"
          className="h-11 gap-1 text-muted-foreground md:h-8"
          onClick={() => setAddingSection(true)}
        >
          <Plus /> Add section
        </Button>
      </div>

      {done.length > 0 ? (
        <section className="mt-6" aria-label="Completed tasks">
          <Button
            variant="ghost"
            className="h-11 gap-1 text-muted-foreground md:h-8"
            aria-expanded={showDone}
            onClick={() => setShowDone((v) => !v)}
          >
            {showDone ? <ChevronDown /> : <ChevronRight />}
            {showDone ? "Hide" : "Show"} {done.length} completed
          </Button>
          {showDone ? rows(done) : null}
        </section>
      ) : null}

      <NameDialog
        open={addingSection}
        onOpenChange={setAddingSection}
        title="New section"
        submitLabel="Add section"
        onSubmit={async (name) => (await run(createSectionAction({ listId: list.id, name }))).ok}
      />
    </div>
  );
}
