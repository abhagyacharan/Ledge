"use client";

import {
  Archive,
  ArchiveRestore,
  ChartColumn,
  ChevronRight,
  Download,
  FileJson,
  FileSpreadsheet,
  FileText,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { cn } from "@/lib/utils";
import { PeriodControl } from "@/modules/expenses/components/period-control";
import { periodLabel, type Period } from "@/modules/expenses/periods";
import {
  archiveListAction,
  restoreListAction,
  trashListAction,
} from "@/modules/todos/actions/lists";
import { run, undoToast } from "@/modules/todos/components/run-action";
import { GroupLabel, pill, RowIcon, rowClass, settingsCard, Sub } from "./ui";

/** Settings › Tasks (screen 9m): archived lists with Restore and Delete, and the way to Trash. */
export function TasksSettings({ lists }: { lists: { id: string; name: string; tasks: number }[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function restore(id: string, name: string) {
    startTransition(async () => {
      const result = await run(archiveListAction({ id, archived: false }), {
        success: `Restored "${name}".`,
      });
      if (result.ok) router.refresh();
    });
  }

  function remove(id: string, name: string) {
    startTransition(async () => {
      const result = await run(trashListAction({ id }));
      if (!result.ok) return;
      router.refresh();
      undoToast(`"${name}" and its tasks moved to Trash.`, () => {
        void run(restoreListAction({ id })).then((r) => r.ok && router.refresh());
      });
    });
  }

  return (
    <>
      <GroupLabel id="archived-title">Archived lists</GroupLabel>
      {lists.length > 0 ? (
        <ul aria-labelledby="archived-title" className={settingsCard}>
          {lists.map((list) => (
            <li
              key={list.id}
              className="flex min-h-16 items-center gap-3 border-t border-dash-edge px-4 py-2.5 first:border-t-0"
            >
              <RowIcon>
                <Archive />
              </RowIcon>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-medium">{list.name}</span>
                <span className="block font-mono text-[12px] font-medium text-dash-ink-soft">
                  {list.tasks} {list.tasks === 1 ? "task" : "tasks"}
                </span>
              </span>
              <button
                type="button"
                disabled={pending}
                onClick={() => restore(list.id, list.name)}
                aria-label={`Restore ${list.name}`}
                className={pill.small}
              >
                <ArchiveRestore aria-hidden className="size-3.5" />
                Restore
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => remove(list.id, list.name)}
                aria-label={`Delete ${list.name}`}
                className={pill.dangerText}
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex items-center gap-3.5 rounded-2xl border-[1.5px] border-dashed border-dash-edge p-5">
          <RowIcon className="size-10">
            <Archive />
          </RowIcon>
          <p className="text-[14px] leading-relaxed text-dash-ink-soft">
            <span className="font-medium text-dash-ink">No archived lists.</span> Lists you archive
            wait here.
          </p>
        </div>
      )}
      <Link
        href="/trash"
        className={cn(
          settingsCard,
          rowClass,
          "min-h-15 outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        )}
      >
        <RowIcon>
          <Trash2 />
        </RowIcon>
        <span className="min-w-0 flex-1">
          <span className="block">Trash</span>
          <Sub>Deleted tasks wait here for 30 days.</Sub>
        </span>
        <ChevronRight aria-hidden className="size-4 text-dash-ink-soft" />
      </Link>
    </>
  );
}

/**
 * Settings › Reports & export (screen 9m): one month pill drives both PDFs (the cash flow covers
 * its year), then the two exports so you can leave at any time.
 */
export function ExportSettings({ thisMonth }: { thisMonth: Period }) {
  const [period, setPeriod] = useState<Period>(thisMonth);
  const month = period.month === "all" ? thisMonth.month : period.month;
  const rows = [
    {
      group: "money",
      icon: FileText,
      label: "Expense breakdown",
      sub: "Spending by category and payment method",
      href: `/api/export/expense-breakdown?y=${period.year}&m=${month}`,
      kind: "PDF",
      aria: `Expense breakdown PDF for ${periodLabel({ year: period.year, month })}`,
    },
    {
      group: "money",
      icon: ChartColumn,
      label: "Cash flow",
      sub: `Inflows against outflows, month by month in ${period.year}`,
      href: `/api/export/cash-flow?y=${period.year}`,
      kind: "PDF",
      aria: `Cash flow PDF for ${period.year}`,
    },
    {
      group: "data",
      icon: FileJson,
      label: "Export everything",
      sub: "Tasks, money, journal and plans",
      href: "/api/export/everything",
      kind: "JSON",
      aria: "Export everything as JSON",
    },
    {
      group: "data",
      icon: FileSpreadsheet,
      label: "Export tasks",
      sub: "One row per task, for a spreadsheet",
      href: "/api/export/tasks",
      kind: "CSV",
      aria: "Export tasks as CSV",
    },
  ];
  const list = (group: string) => (
    <ul className={settingsCard}>
      {rows
        .filter((r) => r.group === group)
        .map((r) => (
          <li
            key={r.label}
            className="flex min-h-16 items-center gap-3 border-t border-dash-edge px-4 py-2.5 first:border-t-0"
          >
            <RowIcon>
              <r.icon />
            </RowIcon>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-medium">{r.label}</span>
              <Sub>{r.sub}</Sub>
            </span>
            <a href={r.href} download aria-label={r.aria} className={pill.small}>
              <Download aria-hidden className="size-3.5" />
              {r.kind}
            </a>
          </li>
        ))}
    </ul>
  );
  return (
    <>
      <div className="flex items-center justify-between gap-3 pt-2">
        <GroupLabel>Money reports</GroupLabel>
        <PeriodControl
          period={{ year: period.year, month }}
          fallback={thisMonth}
          onChange={setPeriod}
          compact
          label="Report month"
        />
      </div>
      {list("money")}
      <GroupLabel>Your data</GroupLabel>
      {list("data")}
    </>
  );
}
