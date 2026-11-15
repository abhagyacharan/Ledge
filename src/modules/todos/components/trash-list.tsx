"use client";

import { Check, Clock, Ellipsis, RotateCcw, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { deleteEntryForeverAction, restoreEntryAction } from "@/modules/expenses/actions";
import { restoreListAction } from "../actions/lists";
import { restoreTaskAction } from "../actions/tasks";
import {
  deleteListForeverAction,
  deleteTaskForeverAction,
  emptyTrashAction,
} from "../actions/trash";
import { ConfirmDialog } from "./confirm-dialog";
import { run } from "./run-action";

export type TrashItem = {
  kind: "list" | "task" | "entry";
  id: string;
  title: string;
  /** After the title: "₹260" for money, "6 tasks" for a list. */
  extra?: string;
  /** Money amounts are shown in mono. */
  extraIsMoney?: boolean;
  /** The round icon on the left. */
  icon: ReactNode;
  /** Phones: "Task · from Home · deleted today". */
  detail: string;
  /** Desktop "From" column: "Task in Home · today". */
  from: string;
  /** Whole days before it is erased for good. */
  daysLeft: number;
  /** "13 Dec": the day it goes for good. */
  goneOn: string;
  /** Where "View" in the restored toast goes (tasks learn theirs from the server). */
  href?: string;
};

/** Rows within this many days of being erased say so in amber, with a clock. */
const SOON_DAYS = 7;

type Filter = "all" | TrashItem["kind"];
const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "task", label: "Tasks" },
  { value: "list", label: "Lists" },
  { value: "entry", label: "Money entries" },
];

const outline =
  "inline-flex h-11 items-center gap-1.5 rounded-full border border-dash-edge bg-dash-card px-3.5 text-[13px] font-medium text-dash-ink outline-none transition-colors duration-150 hover:bg-dash-well focus-visible:ring-3 focus-visible:ring-ring/50 md:h-9";
const solid =
  "inline-flex h-11 items-center gap-1.5 rounded-full bg-dash-ink px-3.5 text-[13px] font-semibold text-dash-card outline-none transition-[transform,background-color] duration-150 ease-snap hover:bg-dash-ink/85 focus-visible:shadow-[0_0_0_2px_var(--dash-card),0_0_0_4px_var(--dash-ink)] active:scale-[0.97] md:h-9";

/**
 * The Trash (docs/new_design.md screens 5c and 6i): chips to show one kind, then every item with
 * what it is, where it came from and when it goes for good. Phones: rows that open to Restore and
 * Delete forever. With a mouse: a table with both buttons on every row. Restoring says where the
 * item went, with a View link.
 */
export function TrashList({ items }: { items: TrashItem[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("all");
  const [open, setOpen] = useState<string | null>(items[0] ? key(items[0]) : null);
  const [confirming, setConfirming] = useState<TrashItem | null>(null);
  const shown = filter === "all" ? items : items.filter((i) => i.kind === filter);
  const count = (f: Filter) =>
    f === "all" ? items.length : items.filter((i) => i.kind === f).length;

  async function restore(item: TrashItem) {
    const view = (href: string | undefined) =>
      href ? { action: { label: "View", onClick: () => router.push(href) } } : undefined;
    if (item.kind === "task") {
      const result = await run(restoreTaskAction({ id: item.id }));
      if (!result.ok) return;
      const { listId, listName, movedToGeneral } = result.data;
      toast.success(
        movedToGeneral
          ? `Restored "${item.title}" to ${listName} (its list is in Trash)`
          : `Restored "${item.title}" to ${listName}`,
        view(`/lists/${listId}`),
      );
      return;
    }
    const result = await run(
      item.kind === "list"
        ? restoreListAction({ id: item.id })
        : restoreEntryAction({ id: item.id }),
    );
    if (result.ok) toast.success(`Restored "${item.title}"`, view(item.href));
  }

  async function deleteForever(item: TrashItem) {
    const action =
      item.kind === "list"
        ? deleteListForeverAction
        : item.kind === "entry"
          ? deleteEntryForeverAction
          : deleteTaskForeverAction;
    await run(action({ id: item.id }), { success: `Deleted "${item.title}" for good` });
  }

  const when = (item: TrashItem, withDate: boolean) =>
    item.daysLeft <= SOON_DAYS ? (
      <span className="inline-flex items-center gap-1 font-semibold text-dash-warn">
        <Clock aria-hidden className="size-3.5" />
        In {item.daysLeft} {item.daysLeft === 1 ? "day" : "days"}
        {withDate ? `, ${item.goneOn}` : ""}
      </span>
    ) : (
      <span>{item.goneOn}</span>
    );

  const title = (item: TrashItem) => (
    <>
      {item.title}
      {item.extra ? (
        <span
          className={cn(
            "ml-1.5",
            item.extraIsMoney ? "font-mono font-medium text-dash-ink" : "text-dash-ink-soft",
          )}
        >
          {item.extraIsMoney ? `· ${item.extra}` : item.extra}
        </span>
      ) : null}
    </>
  );

  return (
    <>
      <ul aria-label="Show" className="mb-3 flex flex-wrap gap-2">
        {FILTERS.filter((f) => f.value === "all" || count(f.value) > 0).map((f) => {
          const on = filter === f.value;
          return (
            <li key={f.value}>
              <button
                type="button"
                aria-pressed={on}
                onClick={() => setFilter(f.value)}
                className={cn(
                  "inline-flex h-11 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-medium outline-none transition-colors duration-150 focus-visible:ring-3 focus-visible:ring-ring/50 md:h-9",
                  on
                    ? "bg-dash-ink font-semibold text-dash-card"
                    : "border border-dash-edge bg-dash-card text-dash-ink hover:bg-dash-well",
                )}
              >
                {on ? <Check aria-hidden className="size-3.5" strokeWidth={2.5} /> : null}
                {f.label} · {count(f.value)}
              </button>
            </li>
          );
        })}
      </ul>

      {/* Phones and tablets: rows. */}
      <ul className="flex flex-col divide-y divide-dash-edge rounded-2xl border border-dash-edge bg-dash-card px-4 shadow-(--dash-card-shadow) lg:hidden">
        {shown.map((item) => {
          const k = key(item);
          const expanded = open === k;
          return (
            <li key={k} className="py-3">
              <div className="flex items-start gap-3">
                <span
                  aria-hidden
                  className="grid size-10 shrink-0 place-items-center rounded-full bg-dash-well text-dash-ink"
                >
                  {item.icon}
                </span>
                <button
                  type="button"
                  aria-expanded={expanded}
                  onClick={() => setOpen(expanded ? null : k)}
                  className="min-w-0 flex-1 rounded-lg text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <span className="block text-[15px] font-medium break-words md:text-sm">
                    {title(item)}
                  </span>
                  <span className="mt-0.5 block text-xs text-dash-ink-soft">{item.detail}</span>
                  <span className="mt-0.5 block text-xs text-dash-ink-soft">
                    {item.daysLeft <= SOON_DAYS ? (
                      when(item, false)
                    ) : (
                      <>Removed for good on {item.goneOn}</>
                    )}
                  </span>
                </button>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    aria-label={`More for ${item.title}`}
                    className="-mt-1 -mr-2 grid size-11 shrink-0 place-items-center rounded-full text-dash-ink-soft outline-none hover:bg-dash-well hover:text-dash-ink focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    <Ellipsis aria-hidden className="size-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44">
                    <DropdownMenuItem onSelect={() => void restore(item)}>
                      <RotateCcw /> Restore
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive" onSelect={() => setConfirming(item)}>
                      <Trash2 /> Delete forever
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              {expanded ? (
                <div className="mt-3 flex flex-wrap gap-2 pl-13">
                  <button
                    type="button"
                    aria-label={`Restore ${item.title}`}
                    onClick={() => void restore(item)}
                    className={solid}
                  >
                    <RotateCcw aria-hidden className="size-4" />
                    Restore
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete forever: ${item.title}`}
                    onClick={() => setConfirming(item)}
                    className={outline}
                  >
                    Delete forever
                  </button>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>

      {/* With a mouse: a table (screen 6i). */}
      <div className="hidden overflow-hidden rounded-2xl border border-dash-edge bg-dash-card shadow-(--dash-card-shadow) lg:block">
        <table className="w-full text-sm">
          <caption className="sr-only">Items in Trash</caption>
          <thead>
            <tr className="border-b border-dash-edge text-left text-xs text-dash-ink-soft">
              <th scope="col" className="py-3 pr-2 pl-5 font-medium">
                Item
              </th>
              <th scope="col" className="px-2 py-3 font-medium">
                From
              </th>
              <th scope="col" className="px-2 py-3 font-medium">
                Removed for good
              </th>
              <th scope="col" className="px-5 py-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-dash-edge">
            {shown.map((item) => (
              <tr key={key(item)} className="group/row">
                <td className="py-2.5 pr-2 pl-5">
                  <span className="flex items-center gap-2.5">
                    <span aria-hidden className="text-dash-ink-soft [&_svg]:size-4">
                      {item.icon}
                    </span>
                    <span className="font-medium">{title(item)}</span>
                  </span>
                </td>
                <td className="px-2 text-dash-ink-soft">{item.from}</td>
                <td className="px-2">{when(item, true)}</td>
                <td className="py-2.5 pr-5">
                  <span className="flex justify-end gap-2">
                    <button
                      type="button"
                      aria-label={`Restore ${item.title}`}
                      onClick={() => void restore(item)}
                      className={cn(
                        outline,
                        "group-hover/row:border-dash-ink group-hover/row:bg-dash-ink group-hover/row:text-dash-card",
                      )}
                    >
                      <RotateCcw aria-hidden className="size-3.5" />
                      Restore
                    </button>
                    <button
                      type="button"
                      aria-label={`Delete forever: ${item.title}`}
                      onClick={() => setConfirming(item)}
                      className={outline}
                    >
                      Delete forever
                    </button>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 px-1 text-xs text-dash-ink-soft">
        Restoring a list brings its tasks back with it. Restoring a task whose list is in Trash puts
        it in General.
      </p>

      <ConfirmDialog
        open={confirming !== null}
        onOpenChange={(next) => !next && setConfirming(null)}
        title={`Delete "${confirming?.title ?? ""}" forever?`}
        description="It can't be restored after this, along with anything inside it."
        confirmLabel="Delete forever"
        onConfirm={() => {
          const target = confirming;
          setConfirming(null);
          if (target) void deleteForever(target);
        }}
      />
    </>
  );
}

/** "Empty trash": a red text button in the page header, with a confirmation. */
export function EmptyTrashButton({ count }: { count: number }) {
  const [confirming, setConfirming] = useState(false);
  if (count === 0) return null;
  return (
    <>
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="-mr-2 inline-flex h-11 items-center gap-1.5 rounded-full px-3 text-[14px] font-semibold text-dash-bad outline-none transition-colors duration-150 hover:bg-dash-bad-bg focus-visible:ring-3 focus-visible:ring-ring/50 md:mr-0 md:h-9 md:bg-dash-bad-bg/60 md:text-[13px]"
      >
        <Trash2 aria-hidden className="hidden size-3.5 md:block" />
        Empty trash
      </button>
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={`Delete ${count} ${count === 1 ? "item" : "items"} forever?`}
        description="They can't be restored after this."
        confirmLabel="Delete forever"
        onConfirm={() => {
          setConfirming(false);
          void run(emptyTrashAction({})).then((result) => {
            if (result.ok) toast.success("Trash emptied");
          });
        }}
      />
    </>
  );
}

function key(item: TrashItem): string {
  return `${item.kind}:${item.id}`;
}
