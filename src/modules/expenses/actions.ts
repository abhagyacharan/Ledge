"use server";

import { z } from "zod";
import { fail, ok } from "@/lib/result";
import {
  createEmiSeries,
  createEntry,
  markEmiPaid,
  restoreEntry,
  trashEntry,
  updateEntry,
  type EntryInput,
} from "@/server/data/finance";
import { deleteTrashedEntryForever } from "@/server/data/trash";
import { guarded, NOT_FOUND, refresh } from "@/server/action-guard";
import {
  createEntrySchema,
  entryIdSchema,
  markPaidSchema,
  updateEntrySchema,
  type CreateEntryInput,
  type UpdateEntryInput,
} from "./schema";

/** Turns validated form data (typed amount already in paise) into what the data layer stores. */
function toEntryInput(data: CreateEntryInput | UpdateEntryInput): EntryInput {
  const common = {
    entryDate: data.entryDate,
    title: data.title,
    category: data.category,
    amountMinor: data.amount,
    notes: data.notes ?? null,
  };
  switch (data.kind) {
    case "income":
      return { kind: "income", ...common };
    case "expense":
      return {
        kind: "expense",
        ...common,
        paymentMethod: data.paymentMethod,
        spendLabel: data.spendLabel,
      };
    case "investment":
      return { kind: "investment", ...common, platform: data.platform ?? null };
    case "emi":
      return {
        kind: "emi",
        ...common,
        lender: data.lender ?? null,
        emiType: data.emiType,
        status: data.status,
        paidOn: data.paidOn ?? null,
      };
  }
}

/** Adds an entry. An EMI can repeat for the next N months (all created as Scheduled). */
export async function createEntryAction(input: unknown) {
  return guarded(createEntrySchema, input, async (data, userId) => {
    const entryInput = toEntryInput(data);
    if (data.kind === "emi") {
      const rows = await createEmiSeries(userId, entryInput, data.repeatMonths);
      refresh();
      return ok({ created: rows.length });
    }
    await createEntry(userId, entryInput);
    refresh();
    return ok({ created: 1 });
  });
}

export async function updateEntryAction(input: unknown) {
  return guarded(updateEntrySchema, input, async (data, userId) => {
    const updated = await updateEntry(userId, data.id, toEntryInput(data));
    if (!updated) return fail(NOT_FOUND);
    refresh();
    return ok();
  });
}

export async function markEmiPaidAction(input: unknown) {
  return guarded(markPaidSchema, input, async ({ id, paidOn }, userId) => {
    if (!(await markEmiPaid(userId, id, paidOn))) return fail(NOT_FOUND);
    refresh();
    return ok();
  });
}

/** Moves an entry to Trash (the toast offers Undo). */
export async function trashEntryAction(input: unknown) {
  return guarded(entryIdSchema, input, async ({ id }, userId) => {
    if (!(await trashEntry(userId, id))) return fail(NOT_FOUND);
    refresh();
    return ok();
  });
}

export async function restoreEntryAction(input: unknown) {
  return guarded(entryIdSchema, input, async ({ id }, userId) => {
    if (!(await restoreEntry(userId, id))) return fail(NOT_FOUND);
    refresh();
    return ok();
  });
}

/** Permanently deletes an entry that is in Trash. */
export async function deleteEntryForeverAction(input: unknown) {
  return guarded(z.object({ id: z.uuid() }), input, async ({ id }, userId) => {
    if (!(await deleteTrashedEntryForever(userId, id))) return fail(NOT_FOUND);
    refresh();
    return ok();
  });
}
