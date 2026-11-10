import { asc, eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/server/db/client";
import { lists, sections, tasks } from "@/server/db/schema";
import { makeList, makeSection, makeTask } from "../helpers/data";
import { createTestUser, resetAuthData, type TestUser } from "../helpers/users";

/**
 * Fractional-index positions must sort byte by byte ("Zz" before "a0", like the JavaScript
 * library does). Migration 0005 gives the position columns the "C" collation; without it a
 * case-insensitive database collation would put "a0" before "Zz".
 */
let a: TestUser;

beforeEach(async () => {
  process.env.ALLOW_SIGNUP = "true";
  await resetAuthData();
  a = await createTestUser("a@example.com", "A");
});

describe("position ordering in the database", () => {
  const keys = ["a0", "Zz", "b0", "B0", "a0V", "A1"];
  const expected = [...keys].sort((x, y) => (x < y ? -1 : x > y ? 1 : 0));

  it("orders lists byte by byte", async () => {
    for (const position of keys) await makeList(a.id, `L-${position}`, { position });
    const rows = await db
      .select({ position: lists.position })
      .from(lists)
      .orderBy(asc(lists.position));
    // The Inbox's "a0" key is also in the table, so compare only the keys inserted here.
    const ours = rows.map((r) => r.position).filter((p) => keys.includes(p));
    expect(ours.filter((p, i, arr) => arr.indexOf(p) === i)).toEqual(
      expected.filter((p, i, arr) => arr.indexOf(p) === i),
    );
  });

  it("orders sections byte by byte", async () => {
    const list = await makeList(a.id, "Host");
    for (const position of keys) {
      const section = await makeSection(a.id, list.id, `S-${position}`);
      await db.update(sections).set({ position }).where(eq(sections.id, section.id));
    }
    const rows = await db
      .select({ position: sections.position })
      .from(sections)
      .orderBy(asc(sections.position));
    expect(rows.map((r) => r.position)).toEqual(expected);
  });

  it("orders tasks byte by byte", async () => {
    const list = await makeList(a.id, "Host");
    for (const position of keys) await makeTask(a.id, list.id, `T-${position}`, { position });
    const rows = await db
      .select({ position: tasks.position })
      .from(tasks)
      .orderBy(asc(tasks.position));
    expect(rows.map((r) => r.position)).toEqual(expected);
  });
});
