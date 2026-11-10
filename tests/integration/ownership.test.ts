import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { deleteList, getList, listLists, renameList } from "@/server/data/lists";
import {
  deleteTaskForever,
  getTask,
  listTasksInList,
  trashTask,
  updateTaskTitle,
} from "@/server/data/tasks";
import { db } from "@/server/db/client";
import { lists, tasks } from "@/server/db/schema";
import { dbError, makeList, makeTask, PG } from "../helpers/data";
import { createTestUser, resetAuthData, type TestUser } from "../helpers/users";

/**
 * CLAUDE.md §5: user B cannot read, update or delete user A's lists or tasks.
 * Someone else's row must look exactly like a row that does not exist.
 */

let a: TestUser;
let b: TestUser;
let aList: Awaited<ReturnType<typeof makeList>>;
let aTask: Awaited<ReturnType<typeof makeTask>>;

beforeEach(async () => {
  process.env.ALLOW_SIGNUP = "true";
  await resetAuthData();
  a = await createTestUser("a@example.com", "A");
  b = await createTestUser("b@example.com", "B");
  aList = await makeList(a.id, "A's list");
  aTask = await makeTask(a.id, aList.id, "A's task");
});

describe("user B cannot read user A's data", () => {
  it("does not see A's lists in a list of lists", async () => {
    const visible = await listLists(b.id);
    expect(visible.every((l) => l.userId === b.id)).toBe(true);
    expect(visible.map((l) => l.id)).not.toContain(aList.id);
  });

  it("cannot fetch A's list or task by id", async () => {
    expect(await getList(b.id, aList.id)).toBeNull();
    expect(await getTask(b.id, aTask.id)).toBeNull();
  });

  it("cannot list the tasks inside A's list", async () => {
    expect(await listTasksInList(b.id, aList.id)).toEqual([]);
  });

  it("B's own data still works (control)", async () => {
    const bList = await makeList(b.id, "B's list");
    const bTask = await makeTask(b.id, bList.id, "B's task");
    expect((await getList(b.id, bList.id))?.id).toBe(bList.id);
    expect((await getTask(b.id, bTask.id))?.id).toBe(bTask.id);
    expect((await listTasksInList(b.id, bList.id)).map((t) => t.id)).toEqual([bTask.id]);
  });
});

describe("user B cannot update user A's data", () => {
  it("cannot rename A's list", async () => {
    expect(await renameList(b.id, aList.id, "Hijacked")).toBeNull();
    const [after] = await db.select().from(lists).where(eq(lists.id, aList.id));
    expect(after.name).toBe("A's list");
  });

  it("cannot retitle A's task", async () => {
    expect(await updateTaskTitle(b.id, aTask.id, "Hijacked")).toBeNull();
    const [after] = await db.select().from(tasks).where(eq(tasks.id, aTask.id));
    expect(after.title).toBe("A's task");
  });

  it("A can update their own data (control)", async () => {
    expect((await renameList(a.id, aList.id, "Renamed"))?.name).toBe("Renamed");
    expect((await updateTaskTitle(a.id, aTask.id, "Retitled"))?.title).toBe("Retitled");
  });
});

describe("user B cannot delete user A's data", () => {
  it("cannot delete A's list", async () => {
    expect(await deleteList(b.id, aList.id)).toBe(false);
    expect(await getList(a.id, aList.id)).not.toBeNull();
  });

  it("cannot move A's task to Trash", async () => {
    expect(await trashTask(b.id, aTask.id)).toBe(false);
    const [after] = await db.select().from(tasks).where(eq(tasks.id, aTask.id));
    expect(after.deletedAt).toBeNull();
  });

  it("cannot delete A's task forever", async () => {
    expect(await deleteTaskForever(b.id, aTask.id)).toBe(false);
    expect(await getTask(a.id, aTask.id)).not.toBeNull();
  });

  it("A can trash and delete their own task (control)", async () => {
    expect(await trashTask(a.id, aTask.id)).toBe(true);
    expect(await getTask(a.id, aTask.id)).toBeNull(); // trashed tasks are hidden from reads
    expect(await deleteTaskForever(a.id, aTask.id)).toBe(true);
  });
});

describe("Trash and the Inbox", () => {
  it("a trashed task is hidden from list reads", async () => {
    await trashTask(a.id, aTask.id);
    expect(await listTasksInList(a.id, aList.id)).toEqual([]);
  });

  it("deleting the Inbox through the data layer is refused by the database", async () => {
    const inbox = (await listLists(a.id)).find((l) => l.isInbox);
    expect(inbox).toBeDefined();
    const error = await dbError(deleteList(a.id, inbox!.id)); // inbox checked just above
    expect(error.code).toBe(PG.checkViolation);
  });
});
