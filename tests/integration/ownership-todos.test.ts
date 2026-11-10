import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import {
  getList,
  moveList,
  restoreList,
  setListArchived,
  trashList,
  updateList,
} from "@/server/data/lists";
import {
  createSection,
  deleteSection,
  listSections,
  moveSection,
  renameSection,
} from "@/server/data/sections";
import {
  createTag,
  deleteTag,
  getTag,
  listTags,
  setTaskTags,
  tagIdsForTasks,
  updateTag,
} from "@/server/data/tags";
import {
  createTask,
  getListTasks,
  getTaskDetail,
  moveTaskToList,
  restoreTask,
  setTaskDone,
  trashTask,
  updateTask,
} from "@/server/data/tasks";
import { db } from "@/server/db/client";
import { lists, tasks } from "@/server/db/schema";
import { makeList, makeTask } from "../helpers/data";
import { createTestUser, resetAuthData, type TestUser } from "../helpers/users";

/**
 * Ownership for the Phase 3 data functions (CLAUDE.md §5). User B must not be able to read,
 * change, move, tag or delete anything of user A's, and must not be able to attach their own
 * rows to A's. Every attempt must behave as if A's row did not exist.
 */

let a: TestUser;
let b: TestUser;
let aList: Awaited<ReturnType<typeof makeList>>;
let aTask: Awaited<ReturnType<typeof makeTask>>;
let aSection: NonNullable<Awaited<ReturnType<typeof createSection>>>;
let aTagId: string;

beforeEach(async () => {
  process.env.ALLOW_SIGNUP = "true";
  await resetAuthData();
  a = await createTestUser("a@example.com", "A");
  b = await createTestUser("b@example.com", "B");
  aList = await makeList(a.id, "A's list");
  const section = await createSection(a.id, aList.id, "A's section");
  if (!section) throw new Error("setup failed");
  aSection = section;
  aTask = await makeTask(a.id, aList.id, "A's task");
  aTagId = (await createTag(a.id, "a-tag")).tag.id;
  await setTaskTags(a.id, aTask.id, [aTagId]);
});

describe("lists", () => {
  it("B cannot edit, archive, move, trash or restore A's list", async () => {
    expect(await updateList(b.id, aList.id, { name: "Hijacked" })).toBeNull();
    expect(await setListArchived(b.id, aList.id, true)).toBeNull();
    expect(await moveList(b.id, aList.id, "up")).toBe(false);
    expect(await trashList(b.id, aList.id)).toBe(false);
    await trashList(a.id, aList.id);
    expect(await restoreList(b.id, aList.id)).toBe(false);
    const [row] = await db.select().from(lists).where(eq(lists.id, aList.id));
    expect(row.name).toBe("A's list");
    expect(row.isArchived).toBe(false);
    expect(row.deletedAt).not.toBeNull(); // still trashed: B could not restore it
  });

  it("B's trashed list is invisible to A's reads, and vice versa", async () => {
    expect(await getList(b.id, aList.id, { includeTrashed: true })).toBeNull();
  });
});

describe("sections", () => {
  it("B cannot create a section in A's list", async () => {
    expect(await createSection(b.id, aList.id, "Sneaky")).toBeNull();
    expect(await listSections(a.id, aList.id)).toHaveLength(1);
  });

  it("B cannot see, rename, move or delete A's section", async () => {
    expect(await listSections(b.id, aList.id)).toEqual([]);
    expect(await renameSection(b.id, aSection.id, "Hijacked")).toBeNull();
    expect(await moveSection(b.id, aSection.id, "up")).toBe(false);
    expect(await deleteSection(b.id, aSection.id)).toBe(false);
    expect((await listSections(a.id, aList.id))[0].name).toBe("A's section");
  });
});

describe("tasks", () => {
  it("B cannot create a task or subtask in A's list or under A's task", async () => {
    expect(await createTask(b.id, { listId: aList.id, title: "Sneaky" })).toBeNull();
    expect(
      await createTask(b.id, { listId: aList.id, title: "Sneaky sub", parentId: aTask.id }),
    ).toBeNull();
    expect(await getListTasks(a.id, aList.id)).toHaveLength(1);
  });

  it("B cannot read A's task detail, update it, complete it, trash it or restore it", async () => {
    expect(await getTaskDetail(b.id, aTask.id)).toBeNull();
    expect(await updateTask(b.id, aTask.id, { title: "Hijacked", priority: 3 })).toBeNull();
    expect(await setTaskDone(b.id, aTask.id, true)).toBeNull();
    expect(await trashTask(b.id, aTask.id)).toBe(false);
    await trashTask(a.id, aTask.id);
    expect(await restoreTask(b.id, aTask.id)).toBe(false);
    const [row] = await db.select().from(tasks).where(eq(tasks.id, aTask.id));
    expect(row).toMatchObject({ title: "A's task", priority: 0, status: "open" });
    expect(row.deletedAt).not.toBeNull();
  });

  it("B cannot move A's task, nor move their own task into A's list", async () => {
    const bList = await makeList(b.id, "B's list");
    const bTask = await makeTask(b.id, bList.id, "B's task");
    expect(await moveTaskToList(b.id, aTask.id, bList.id)).toBeNull();
    expect(await moveTaskToList(b.id, bTask.id, aList.id)).toBeNull();
    expect((await getTaskDetail(a.id, aTask.id))?.task.listId).toBe(aList.id);
    expect((await getTaskDetail(b.id, bTask.id))?.task.listId).toBe(bList.id);
  });

  it("B cannot put their task into A's section", async () => {
    const bList = await makeList(b.id, "B's list");
    const bTask = await makeTask(b.id, bList.id);
    expect(await updateTask(b.id, bTask.id, { sectionId: aSection.id })).toBeNull();
    expect(
      await createTask(b.id, { listId: bList.id, title: "x", sectionId: aSection.id }),
    ).toBeNull();
  });
});

describe("tags", () => {
  it("B does not see A's tags, and a same-named tag is a separate tag", async () => {
    expect(await listTags(b.id)).toEqual([]);
    const theirs = await createTag(b.id, "A-TAG");
    expect(theirs.created).toBe(true);
    expect(theirs.tag.id).not.toBe(aTagId);
  });

  it("B cannot rename, recolor, read or delete A's tag", async () => {
    expect(await getTag(b.id, aTagId)).toBeNull();
    expect(await updateTag(b.id, aTagId, { name: "Hijacked" })).toBeNull();
    expect(await deleteTag(b.id, aTagId)).toBe(false);
    expect((await getTag(a.id, aTagId))?.name).toBe("a-tag");
  });

  it("B cannot tag A's task, and cannot use A's tag on their own task", async () => {
    const bTag = (await createTag(b.id, "b-tag")).tag;
    expect(await setTaskTags(b.id, aTask.id, [bTag.id])).toBe(false);
    const bList = await makeList(b.id, "B's list");
    const bTask = await makeTask(b.id, bList.id);
    expect(await setTaskTags(b.id, bTask.id, [aTagId])).toBe(false);
    // Nothing changed for A or B.
    expect((await tagIdsForTasks(a.id, [aTask.id])).get(aTask.id)).toEqual([aTagId]);
    expect((await tagIdsForTasks(b.id, [bTask.id])).get(bTask.id)).toBeUndefined();
  });

  it("B cannot read the tag links of A's tasks", async () => {
    expect((await tagIdsForTasks(b.id, [aTask.id])).size).toBe(0);
  });
});
