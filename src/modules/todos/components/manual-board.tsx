"use client";

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { useState } from "react";
import { sortByPosition } from "@/lib/ordering";
import type { Section } from "@/server/db/schema";
import type { TaskRow as TaskRowData } from "@/server/data/tasks";
import { reorderTaskAction } from "../actions/tasks";
import { InlineAdd } from "./inline-add";
import { run } from "./run-action";
import { SectionBlock } from "./section-block";
import { TaskRow } from "./task-row";
import type { DateContext, TagsById } from "./types";

const NO_SECTION = "none";
const CONTAINER_PREFIX = "container:";

type Props = {
  listId: string;
  sections: Section[];
  /** Top-level tasks that passed the filters (open and, when shown, finished). */
  tasks: TaskRowData[];
  subtasksOf: (id: string) => TaskRowData[];
  tagsById: TagsById;
  ctx: DateContext;
};

/**
 * Manual order with drag and drop (CLAUDE.md §6.2): tasks can be reordered inside a section and
 * moved to another section. Each row has a drag handle that works with mouse, touch and keyboard
 * (Space to pick up, arrow keys to move, Space to drop, Escape to cancel).
 * The new order shows at once; if saving fails the old order comes back with an error message.
 */
export function ManualBoard({ listId, sections, tasks, subtasksOf, tagsById, ctx }: Props) {
  const containers = [
    { id: NO_SECTION, sectionId: null as string | null, section: null as Section | null },
    ...sections.map((s) => ({ id: s.id, sectionId: s.id as string | null, section: s })),
  ];

  const open = tasks.filter((t) => t.status === "open");
  const done = tasks.filter((t) => t.status === "done");

  const [ids, setIds] = useState<Record<string, string[]>>(() =>
    Object.fromEntries(
      containers.map((c) => [
        c.id,
        sortByPosition(open.filter((t) => (t.sectionId ?? NO_SECTION) === c.id)).map((t) => t.id),
      ]),
    ),
  );

  const byId = new Map(tasks.map((t) => [t.id, t]));
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const containerOf = (taskId: string) =>
    Object.keys(ids).find((key) => ids[key].includes(taskId)) ?? null;

  async function onDragEnd({ active, over }: DragEndEvent) {
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    const from = containerOf(activeId);
    if (!from) return;

    let to: string;
    let index: number;
    if (overId.startsWith(CONTAINER_PREFIX)) {
      to = overId.slice(CONTAINER_PREFIX.length);
      if (to === from) return;
      index = ids[to].length;
    } else {
      const overContainer = containerOf(overId);
      if (!overContainer) return;
      to = overContainer;
      const overIndex = ids[to].indexOf(overId);
      if (to === from) {
        index = overIndex;
      } else {
        const moved = active.rect.current.translated;
        const below = moved ? moved.top > over.rect.top + over.rect.height / 2 : false;
        index = overIndex + (below ? 1 : 0);
      }
    }

    const previous = ids;
    let next: Record<string, string[]>;
    if (to === from) {
      const reordered = arrayMove(ids[from], ids[from].indexOf(activeId), index);
      if (reordered.every((id, i) => id === ids[from][i])) return;
      next = { ...ids, [from]: reordered };
    } else {
      const target = [...ids[to]];
      target.splice(index, 0, activeId);
      next = { ...ids, [from]: ids[from].filter((id) => id !== activeId), [to]: target };
    }

    const placed = next[to];
    const at = placed.indexOf(activeId);
    setIds(next);
    const target = containers.find((c) => c.id === to);
    const result = await run(
      reorderTaskAction({
        id: activeId,
        afterId: placed[at - 1] ?? null,
        beforeId: placed[at + 1] ?? null,
        ...(to === from ? {} : { sectionId: target?.sectionId ?? null }),
      }),
    );
    if (!result.ok) setIds(previous);
  }

  const doneIn = (containerId: string) =>
    done.filter((t) => (t.sectionId ?? NO_SECTION) === containerId);

  const renderContainer = (c: (typeof containers)[number]) => {
    const rows = ids[c.id].map((id) => byId.get(id)).filter((t): t is TaskRowData => Boolean(t));
    const finished = doneIn(c.id);
    const list = (
      <Container id={c.id}>
        <SortableContext items={ids[c.id]} strategy={verticalListSortingStrategy}>
          <ul className="min-h-2">
            {rows.map((task) => (
              <SortableRow
                key={task.id}
                task={task}
                subtasks={subtasksOf(task.id)}
                tagsById={tagsById}
                ctx={ctx}
              />
            ))}
            {finished.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                subtasks={subtasksOf(task.id)}
                tagsById={tagsById}
                ctx={ctx}
              />
            ))}
          </ul>
        </SortableContext>
        <InlineAdd
          listId={listId}
          sectionId={c.sectionId}
          label={c.section ? `Add to ${c.section.name}` : "Add a task"}
        />
      </Container>
    );
    return c.section ? (
      <SectionBlock key={c.id} section={c.section} count={rows.length}>
        {list}
      </SectionBlock>
    ) : (
      <div key={c.id}>{list}</div>
    );
  };

  return (
    <DndContext
      id={`board-${listId}`}
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={onDragEnd}
    >
      {containers.map(renderContainer)}
    </DndContext>
  );
}

function Container({ id, children }: { id: string; children: React.ReactNode }) {
  const { setNodeRef } = useDroppable({ id: `${CONTAINER_PREFIX}${id}` });
  return <div ref={setNodeRef}>{children}</div>;
}

function SortableRow({
  task,
  subtasks,
  tagsById,
  ctx,
}: {
  task: TaskRowData;
  subtasks: TaskRowData[];
  tagsById: TagsById;
  ctx: DateContext;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  return (
    <TaskRow
      task={task}
      subtasks={subtasks}
      tagsById={tagsById}
      ctx={ctx}
      liRef={setNodeRef}
      liStyle={{ transform: CSS.Transform.toString(transform), transition }}
      dragging={isDragging}
      handle={
        <button
          type="button"
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          aria-label={`Reorder ${task.title}`}
          className="flex size-11 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 active:cursor-grabbing md:size-8"
        >
          <GripVertical className="size-4" aria-hidden />
        </button>
      }
    />
  );
}
