import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PlanItem } from "@/modules/voice/schema";
import { createEntry, getEntry } from "@/server/data/finance";
import { getInbox, listLists } from "@/server/data/lists";
import { db } from "@/server/db/client";
import { financeEntries, tasks, userSettings } from "@/server/db/schema";
import { resetVoiceLimits, takeVoiceRequest } from "@/server/voice-limit";
import { testAuth } from "../helpers/action-session";
import { createUser, resetAuthData, type TestUser } from "../helpers/fast-users";

// Server actions read the signed-in user and revalidate pages; stand both in (see the helper).
vi.mock("@/server/session", async () => (await import("../helpers/action-session")).sessionModule);
vi.mock("next/headers", async () => (await import("../helpers/action-session")).headersModule);
vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));

const { applyVoicePlanAction, undoVoicePlanAction } = await import("@/modules/voice/actions");
const { understandForUser } = await import("@/server/voice");

let a: TestUser;
let b: TestUser;

beforeEach(async () => {
  process.env.ALLOW_SIGNUP = "true";
  await resetAuthData();
  resetVoiceLimits();
  a = await createUser("a@example.com", "A");
  b = await createUser("b@example.com", "B");
  testAuth.reset(a.id);
});

const emi = (userId: string, over: Partial<Parameters<typeof createEntry>[1]> = {}) =>
  createEntry(userId, {
    kind: "emi",
    entryDate: "2026-11-10",
    title: "Bike loan",
    category: "Vehicle loan",
    amountMinor: 700000,
    status: "scheduled",
    ...over,
  });

function plan(generalId: string, emiId: string): PlanItem[] {
  return [
    { type: "list", key: "v1", name: "Photography" },
    {
      type: "task",
      key: "v2",
      title: "Take 5 photos of the sun",
      listId: null,
      listKey: "v1",
      dueDate: "2026-11-15",
      dueTime: null,
      priority: 0,
      notes: null,
    },
    {
      type: "task",
      key: "v3",
      title: "Make blueberry cheesecake",
      listId: generalId,
      listKey: null,
      dueDate: null,
      dueTime: null,
      priority: 2,
      notes: null,
    },
    {
      type: "entry",
      key: "v4",
      kind: "expense",
      amountMinor: 50000,
      title: "Petrol",
      category: "Transportation",
      paymentMethod: "UPI",
      spendLabel: "need",
      entryDate: "2026-11-15",
      guessed: { category: true, spendLabel: true },
      hints: [],
    },
    {
      type: "emi_paid",
      key: "v5",
      emiId,
      paidOn: "2026-11-15",
      heardAmountMinor: 700000,
      hints: [],
    },
    { type: "unclear", key: "v6", text: "hmm", reason: "not sure" },
  ];
}

describe("applyVoicePlanAction", () => {
  it("saves a whole plan, and Undo takes all of it back", async () => {
    const general = await getInbox(a.id);
    const loan = await emi(a.id);
    const result = await applyVoicePlanAction({ items: plan(general.id, loan.id) });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const receipt = result.data;
    expect(receipt.summary).toBe("Added 2 tasks, 1 list, 1 expense and marked 1 EMI paid");
    expect(receipt.listIds).toHaveLength(1);

    const photography = (await listLists(a.id)).find((l) => l.name === "Photography");
    expect(photography).toBeDefined();
    const saved = await db.select().from(tasks).where(eq(tasks.userId, a.id));
    expect(saved.map((t) => [t.title, t.listId]).sort()).toEqual(
      [
        ["Make blueberry cheesecake", general.id],
        ["Take 5 photos of the sun", photography?.id],
      ].sort(),
    );
    expect((await getEntry(a.id, loan.id))?.status).toBe("paid");

    const undone = await undoVoicePlanAction(receipt);
    expect(undone.ok).toBe(true);
    expect(await db.select().from(tasks).where(eq(tasks.userId, a.id))).toHaveLength(0);
    expect((await listLists(a.id)).some((l) => l.name === "Photography")).toBe(false);
    const entries = await db.select().from(financeEntries).where(eq(financeEntries.userId, a.id));
    expect(entries.map((e) => e.title)).toEqual(["Bike loan"]);
    expect(entries[0]).toMatchObject({ status: "scheduled", paidOn: null });
  });

  it("refuses another user's list or EMI, and saves nothing", async () => {
    const theirs = await getInbox(b.id);
    const theirLoan = await emi(b.id);
    const mine = await emi(a.id);
    const items = plan(theirs.id, mine.id);
    expect(await applyVoicePlanAction({ items })).toMatchObject({ ok: false });

    const general = await getInbox(a.id);
    expect(await applyVoicePlanAction({ items: plan(general.id, theirLoan.id) })).toMatchObject({
      ok: false,
    });
    expect(await db.select().from(tasks).where(eq(tasks.userId, a.id))).toHaveLength(0);
    expect((await getEntry(b.id, theirLoan.id))?.status).toBe("scheduled");
  });

  it("refuses an EMI that is already paid, a made-up category and an EMI not picked", async () => {
    const general = await getInbox(a.id);
    const paid = await emi(a.id, { status: "paid", paidOn: "2026-11-01" });
    expect(await applyVoicePlanAction({ items: plan(general.id, paid.id) })).toMatchObject({
      ok: false,
      error: '"Bike loan" is already paid.',
    });

    const loan = await emi(a.id);
    const items = plan(general.id, loan.id).map((i) =>
      i.type === "entry" ? { ...i, category: "Fuel" } : i,
    );
    expect(await applyVoicePlanAction({ items })).toMatchObject({ ok: false });

    const unpicked = plan(general.id, loan.id).map((i) =>
      i.type === "emi_paid" ? { ...i, emiId: null } : i,
    );
    expect(await applyVoicePlanAction({ items: unpicked })).toMatchObject({ ok: false });
    expect(await db.select().from(tasks).where(eq(tasks.userId, a.id))).toHaveLength(0);
  });

  it("refuses a plan with only unclear items", async () => {
    const result = await applyVoicePlanAction({
      items: [{ type: "unclear", key: "v1", text: "hmm", reason: "x" }],
    });
    expect(result).toMatchObject({ ok: false, error: "Nothing to add." });
  });
});

describe("understandForUser (fake mode)", () => {
  it("turns words into a plan with the user's own lists and EMIs", async () => {
    process.env.VOICE_FAKE = "1";
    try {
      const loan = await emi(a.id, { entryDate: new Date().toISOString().slice(0, 10) });
      const result = await understandForUser(
        a.id,
        "Had to pay the EMI of bike loan of 7,000 today",
        null,
      );
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.items[0]).toMatchObject({ type: "emi_paid", emiId: loan.id });
      expect(result.data.emis.map((e) => e.id)).toEqual([loan.id]);

      // B's EMIs are never offered to A.
      await emi(b.id);
      const again = await understandForUser(a.id, "paid the bike loan emi", null);
      expect(again.ok && again.data.emis.map((e) => e.id)).toEqual([loan.id]);
    } finally {
      delete process.env.VOICE_FAKE;
    }
  });

  it("is off without a key or fake mode, and when the user switched it off", async () => {
    delete process.env.VOICE_FAKE;
    const key = process.env.GROQ_API_KEY;
    delete process.env.GROQ_API_KEY;
    try {
      expect(await understandForUser(a.id, "spent 500 on petrol", null)).toEqual({
        ok: false,
        failure: "off",
      });
      process.env.VOICE_FAKE = "1";
      await db
        .update(userSettings)
        .set({ voiceEnabled: false })
        .where(eq(userSettings.userId, a.id));
      expect(await understandForUser(a.id, "spent 500 on petrol", null)).toEqual({
        ok: false,
        failure: "off",
      });
    } finally {
      delete process.env.VOICE_FAKE;
      if (key) process.env.GROQ_API_KEY = key;
    }
  });
});

describe("voice rate limit", () => {
  it("allows 20 a minute, then a fresh minute, and stops at the daily cap", () => {
    const start = new Date("2026-11-15T10:00:00Z");
    for (let i = 0; i < 20; i++) expect(takeVoiceRequest("u", 300, start).ok).toBe(true);
    expect(takeVoiceRequest("u", 300, start)).toEqual({ ok: false, reason: "minute" });
    expect(takeVoiceRequest("u", 300, new Date("2026-11-15T10:01:00Z")).ok).toBe(true);
    expect(takeVoiceRequest("other", 300, start).ok).toBe(true);

    resetVoiceLimits();
    for (let i = 0; i < 3; i++) takeVoiceRequest("d", 3, new Date(start.getTime() + i * 61_000));
    expect(takeVoiceRequest("d", 3, new Date(start.getTime() + 300_000))).toEqual({
      ok: false,
      reason: "day",
    });
    expect(takeVoiceRequest("d", 3, new Date("2026-11-16T10:00:00Z")).ok).toBe(true);
  });
});
