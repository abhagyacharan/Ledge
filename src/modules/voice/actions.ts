"use server";

import { fail, ok } from "@/lib/result";
import { CATEGORIES_BY_KIND, KIND_LABELS, PAYMENT_METHODS } from "@/modules/expenses/categories";
import { guarded, refresh } from "@/server/action-guard";
import {
  createEntry,
  getEntry,
  markEmiPaid,
  setEmiStatus,
  trashEntry,
} from "@/server/data/finance";
import { createList, listLists, trashList } from "@/server/data/lists";
import { createTask, trashTask } from "@/server/data/tasks";
import {
  deleteTrashedEntryForever,
  deleteTrashedListForever,
  deleteTrashedTaskForever,
} from "@/server/data/trash";
import { applyVoicePlanInput, type PlanItem, undoVoiceInput, type VoiceReceipt } from "./schema";

/**
 * Saving a reviewed voice plan (docs/voice-spec.md §9). Everything is checked again here: lists
 * and EMIs must be the user's own, categories and methods must be real. Then it is saved all or
 * nothing: if any step fails, what was already written is taken back before answering.
 */

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

function summaryOf(counts: {
  lists: number;
  tasks: number;
  entries: Map<string, number>;
  emis: number;
}) {
  const parts: string[] = [];
  if (counts.tasks) parts.push(plural(counts.tasks, "task", "tasks"));
  if (counts.lists) parts.push(plural(counts.lists, "list", "lists"));
  for (const [kind, n] of counts.entries) {
    const label = KIND_LABELS[kind as keyof typeof KIND_LABELS];
    parts.push(plural(n, label.singular.toLowerCase(), label.plural.toLowerCase()));
  }
  if (counts.emis) parts.push(`marked ${plural(counts.emis, "EMI", "EMIs")} paid`);
  if (parts.length === 0) return "Nothing added";
  const last = parts.pop();
  return `Added ${parts.length ? `${parts.join(", ")} and ${last}` : last}`.replace(
    "Added marked",
    "Marked",
  );
}

async function takeBack(userId: string, receipt: Omit<VoiceReceipt, "summary">) {
  for (const id of receipt.taskIds) {
    if (await trashTask(userId, id)) await deleteTrashedTaskForever(userId, id);
  }
  for (const id of receipt.entryIds) {
    if (await trashEntry(userId, id)) await deleteTrashedEntryForever(userId, id);
  }
  for (const id of receipt.listIds) {
    if (await trashList(userId, id)) await deleteTrashedListForever(userId, id);
  }
  for (const emi of receipt.emis) await setEmiStatus(userId, emi.id, emi.status, emi.paidOn);
}

export async function applyVoicePlanAction(input: unknown) {
  return guarded(applyVoicePlanInput, input, async ({ items }, userId) => {
    const wanted = items.filter(
      (i): i is Exclude<PlanItem, { type: "unclear" }> => i.type !== "unclear",
    );
    if (wanted.length === 0) return fail("Nothing to add.");

    // 1. Check everything before writing anything.
    const ownLists = new Set((await listLists(userId)).map((l) => l.id));
    const methods: readonly string[] = PAYMENT_METHODS;
    const emiBefore = new Map<
      string,
      { status: "scheduled" | "paid" | "delayed"; paidOn: string | null }
    >();
    for (const item of wanted) {
      if (item.type === "task" && item.listId && !ownLists.has(item.listId)) {
        return fail("One of the lists no longer exists. Pick another.");
      }
      if (item.type === "entry") {
        if (!CATEGORIES_BY_KIND[item.kind].includes(item.category)) return fail("Pick a category.");
        if (item.paymentMethod && !methods.includes(item.paymentMethod)) {
          return fail("Pick how you paid.");
        }
      }
      if (item.type === "emi_paid" && item.emiId) {
        const emi = await getEntry(userId, item.emiId);
        if (!emi || emi.kind !== "emi") return fail("That EMI no longer exists. Pick another.");
        if (emi.status === "paid") return fail(`"${emi.title}" is already paid.`);
        emiBefore.set(emi.id, { status: emi.status ?? "scheduled", paidOn: emi.paidOn });
      }
    }

    // 2. Save in order: lists first, so tasks can point at them. Take everything back on failure.
    const receipt: Omit<VoiceReceipt, "summary"> = {
      listIds: [],
      taskIds: [],
      entryIds: [],
      emis: [],
    };
    const listIdByKey = new Map<string, string>();
    const entryCounts = new Map<string, number>();
    try {
      for (const item of wanted) {
        if (item.type !== "list") continue;
        const list = await createList(userId, { name: item.name });
        receipt.listIds.push(list.id);
        listIdByKey.set(item.key, list.id);
      }
      for (const item of wanted) {
        if (item.type === "task") {
          const listId = item.listId ?? (item.listKey ? listIdByKey.get(item.listKey) : undefined);
          if (!listId) throw new Error("task without a list");
          const task = await createTask(userId, {
            listId,
            title: item.title,
            notes: item.notes,
            priority: item.priority,
            dueDate: item.dueDate,
            dueTime: item.dueDate ? item.dueTime : null,
          });
          if (!task) throw new Error("task not created");
          receipt.taskIds.push(task.id);
        } else if (item.type === "entry") {
          const entry = await createEntry(userId, {
            kind: item.kind,
            entryDate: item.entryDate,
            title: item.title,
            category: item.category,
            amountMinor: item.amountMinor,
            paymentMethod: item.kind === "expense" ? item.paymentMethod : null,
            spendLabel: item.kind === "expense" ? item.spendLabel : null,
          });
          receipt.entryIds.push(entry.id);
          entryCounts.set(item.kind, (entryCounts.get(item.kind) ?? 0) + 1);
        } else if (item.type === "emi_paid" && item.emiId) {
          const before = emiBefore.get(item.emiId);
          const marked = await markEmiPaid(userId, item.emiId, item.paidOn);
          if (!marked || !before) throw new Error("EMI not marked");
          receipt.emis.push({ id: item.emiId, ...before });
        }
      }
    } catch (error) {
      console.error(
        "Voice save failed, taking it back:",
        error instanceof Error ? error.message : error,
      );
      await takeBack(userId, receipt);
      return fail("Couldn't save. Nothing was added; try again.");
    }

    refresh();
    return ok<VoiceReceipt>({
      ...receipt,
      summary: summaryOf({
        lists: receipt.listIds.length,
        tasks: receipt.taskIds.length,
        entries: entryCounts,
        emis: receipt.emis.length,
      }),
    });
  });
}

/** Undo for a whole voice command: removes what it created and puts EMIs back as they were. */
export async function undoVoicePlanAction(input: unknown) {
  return guarded(undoVoiceInput, input, async (receipt, userId) => {
    await takeBack(userId, receipt);
    refresh();
    return ok();
  });
}
