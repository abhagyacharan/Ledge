"use client";

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type ScreenReaderInstructions,
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
import type { TaskRow as TaskRowData } from "@/server/data/tasks";
import { reorderTaskAction } from "../actions/tasks";
import { run } from "./run-action";
import { TaskRow } from "./task-row";
import type { DateContext } from "./types";

type Props = {
  listId: string;
  /** Top-level tasks that passed the filters (open and, when shown, finished). */
  tasks: TaskRowData[];
  subtasksOf: (id: string) => TaskRowData[];
  ctx: DateContext;
};

/**
 * Manual order with drag and drop (CLAUDE.md §6.2). Each open task has a grip that works with
 * mouse, touch and keyboard (Space to pick up, arrow keys to move, Space to drop, Escape to
 * cancel). The new order shows at once; if saving fails the old order comes back with a message.
 * Finished tasks (when shown) sit below and do not move.
 */
export function ManualBoard({ listId, tasks, subtasksOf, ctx }: Props) {
  const open = tasks.filter((t) => t.status === "open");
  const done = tasks.filter((t) => t.status === "done");
  const [ids, setIds] = useState<string[]>(() => sortByPosition(open).map((t) => t.id));

  const byId = new Map(tasks.map((t) => [t.id, t]));
  // Screen readers hear task titles and places, not the internal ids dnd-kit would otherwise read.
  const titleOf = (id: string | number) => byId.get(String(id))?.title ?? "task";
  const placeOf = (id: string | number) =>
    `position ${ids.indexOf(String(id)) + 1} of ${ids.length}`;
  const announcements: Announcements = {
    onDragStart: ({ active }) => `Picked up ${titleOf(active.id)}, ${placeOf(active.id)}.`,
    onDragOver: ({ active, over }) =>
      over && over.id !== active.id
        ? `${titleOf(active.id)} is over ${titleOf(over.id)}.`
        : undefined,
    onDragEnd: ({ active, over }) =>
      over ? `Dropped ${titleOf(active.id)}.` : `${titleOf(active.id)} was not moved.`,
    onDragCancel: ({ active }) => `Move cancelled. ${titleOf(active.id)} is back where it was.`,
  };
  const instructions: ScreenReaderInstructions = {
    draggable:
      "To move a task, press Space to pick it up, use the arrow keys to move it, then press Space to drop it, or Escape to cancel.",
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  async function onDragEnd({ active, over }: DragEndEvent) {
    if (!over || over.id === active.id) return;
    const from = ids.indexOf(String(active.id));
    const to = ids.indexOf(String(over.id));
    if (from < 0 || to < 0) return;
    const previous = ids;
    const next = arrayMove(ids, from, to);
    setIds(next);
    const at = next.indexOf(String(active.id));
    const result = await run(
      reorderTaskAction({
        id: String(active.id),
        afterId: next[at - 1] ?? null,
        beforeId: next[at + 1] ?? null,
      }),
    );
    if (!result.ok) setIds(previous);
  }

  const rows = ids.map((id) => byId.get(id)).filter((t): t is TaskRowData => Boolean(t));

  return (
    <DndContext
      id={`board-${listId}`}
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={onDragEnd}
      accessibility={{ announcements, screenReaderInstructions: instructions }}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <ul>
          {rows.map((task) => (
            <SortableRow key={task.id} task={task} subtasks={subtasksOf(task.id)} ctx={ctx} />
          ))}
          {done.map((task) => (
            <TaskRow key={task.id} task={task} subtasks={subtasksOf(task.id)} ctx={ctx} />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}

function SortableRow({
  task,
  subtasks,
  ctx,
}: {
  task: TaskRowData;
  subtasks: TaskRowData[];
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
          className="flex h-11 w-11 shrink-0 cursor-grab md:-mr-1.5 md:w-7 touch-none items-center justify-center rounded-lg text-dash-ink-soft/70 outline-none transition-opacity duration-150 hover:text-dash-ink focus-visible:ring-3 focus-visible:ring-ring/50 active:cursor-grabbing md:h-9 md:opacity-0 md:group-hover/row:opacity-100 md:focus-visible:opacity-100 [@media(hover:none)]:md:opacity-100"
        >
          <GripVertical className="size-4" aria-hidden />
        </button>
      }
    />
  );
}
