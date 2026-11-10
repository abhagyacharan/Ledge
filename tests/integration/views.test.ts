import { beforeEach, describe, expect, it } from "vitest";
import { sortByPosition } from "@/lib/ordering";
import { createList, setListArchived, setListViewSettings, trashList } from "@/server/data/lists";
import { createSection } from "@/server/data/sections";
import { createTag, setTaskTags } from "@/server/data/tags";
import {
  createTask,
  getListTasks,
  getTask,
  reorderTask,
  setTaskDone,
  trashTask,
} from "@/server/data/tasks";
import {
  getAllTasks,
  getCompletedTasks,
  getDueBetweenTasks,
  getDueByTasks,
  getTaggedTasks,
} from "@/server/data/views";
import { db } from "@/server/db/client";
import { lists } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { parseViewSettings } from "@/modules/todos/view-settings";
import { createUser, resetAuthData, type TestUser } from "../helpers/fast-users";

let a: TestUser;
let b: TestUser;

beforeEach(async () => {
  process.env.ALLOW_SIGNUP = "true";
  await resetAuthData();
  a = await createUser("a@example.com", "A");
  b = await createUser("b@example.com", "B");
});

async function listFor(user: TestUser, name = "List") {
  return createList(user.id, { name });
}

async function taskFor(user: TestUser, listId: string, title: string, extra = {}) {
  const task = await createTask(user.id, { listId, title, ...extra });
  if (!task) throw new Error("expected the task to be created");
  return task;
}

const titles = (rows: { title: string }[]) => rows.map((r) => r.title).sort();

describe("Today and Upcoming queries", () => {
  it("getDueByTasks returns open tasks due today or earlier, with list context and tags", async () => {
    const home = await listFor(a, "Home");
    const overdue = await taskFor(a, home.id, "Overdue", { dueDate: "2026-11-01" });
    await taskFor(a, home.id, "Today", { dueDate: "2026-11-10" });
    await taskFor(a, home.id, "Tomorrow", { dueDate: "2026-11-11" });
    await taskFor(a, home.id, "Undated");
    const finished = await taskFor(a, home.id, "Finished", { dueDate: "2026-11-02" });
    await setTaskDone(a.id, finished.id, true);
    const { tag } = await createTag(a.id, "bills");
    await setTaskTags(a.id, overdue.id, [tag.id]);

    const rows = await getDueByTasks(a.id, "2026-11-10");
    expect(titles(rows)).toEqual(["Overdue", "Today"]);
    const row = rows.find((r) => r.title === "Overdue");
    expect(row).toMatchObject({ listName: "Home", listIsInbox: false, tagIds: [tag.id] });
  });

  it("includes dated subtasks, with the parent's title", async () => {
    const home = await listFor(a, "Home");
    const parent = await taskFor(a, home.id, "Plan trip");
    await taskFor(a, home.id, "Book hotel", { parentId: parent.id, dueDate: "2026-11-10" });
    const rows = await getDueByTasks(a.id, "2026-11-10");
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ title: "Book hotel", parentTitle: "Plan trip" });
  });

  it("getDueBetweenTasks is inclusive at both ends", async () => {
    const home = await listFor(a);
    await taskFor(a, home.id, "before", { dueDate: "2026-11-10" });
    await taskFor(a, home.id, "first", { dueDate: "2026-11-11" });
    await taskFor(a, home.id, "last", { dueDate: "2026-11-24" });
    await taskFor(a, home.id, "after", { dueDate: "2026-11-25" });
    const rows = await getDueBetweenTasks(a.id, "2026-11-11", "2026-11-24");
    expect(titles(rows)).toEqual(["first", "last"]);
  });
});

describe("what the views hide", () => {
  it("hides trashed tasks, trashed lists and archived lists, and their tasks", async () => {
    const shown = await listFor(a, "Shown");
    const archived = await listFor(a, "Archived");
    const trashed = await listFor(a, "Trashed");
    await taskFor(a, shown.id, "visible", { dueDate: "2026-11-01" });
    const gone = await taskFor(a, shown.id, "in trash", { dueDate: "2026-11-01" });
    await taskFor(a, archived.id, "archived list task", { dueDate: "2026-11-01" });
    await taskFor(a, trashed.id, "trashed list task", { dueDate: "2026-11-01" });
    await trashTask(a.id, gone.id);
    await setListArchived(a.id, archived.id, true);
    await trashList(a.id, trashed.id);

    expect(titles(await getDueByTasks(a.id, "2026-11-10"))).toEqual(["visible"]);
    expect(titles(await getAllTasks(a.id))).toEqual(["visible"]);
  });

  it("never returns another user's tasks", async () => {
    const mine = await listFor(a);
    const theirs = await listFor(b);
    await taskFor(a, mine.id, "mine", { dueDate: "2026-11-01" });
    await taskFor(b, theirs.id, "theirs", { dueDate: "2026-11-01" });
    expect(titles(await getDueByTasks(a.id, "2026-11-10"))).toEqual(["mine"]);
    expect(titles(await getAllTasks(a.id))).toEqual(["mine"]);
    expect(titles(await getDueBetweenTasks(a.id, "2026-01-01", "2026-12-31"))).toEqual(["mine"]);
    expect(await getCompletedTasks(a.id)).toEqual([]);
  });
});

describe("All and Completed queries", () => {
  it("getAllTasks returns open and done tasks including subtasks", async () => {
    const home = await listFor(a);
    const parent = await taskFor(a, home.id, "parent");
    await taskFor(a, home.id, "child", { parentId: parent.id });
    const done = await taskFor(a, home.id, "done");
    await setTaskDone(a.id, done.id, true);
    expect(titles(await getAllTasks(a.id))).toEqual(["child", "done", "parent"]);
  });

  it("getCompletedTasks returns finished tasks newest first and respects the limit", async () => {
    const home = await listFor(a);
    const first = await taskFor(a, home.id, "first");
    const second = await taskFor(a, home.id, "second");
    const open = await taskFor(a, home.id, "still open");
    await setTaskDone(a.id, first.id, true);
    await new Promise((r) => setTimeout(r, 15));
    await setTaskDone(a.id, second.id, true);
    expect(open.status).toBe("open");

    expect((await getCompletedTasks(a.id)).map((t) => t.title)).toEqual(["second", "first"]);
    expect((await getCompletedTasks(a.id, 1)).map((t) => t.title)).toEqual(["second"]);
  });
});

describe("Tag view query", () => {
  it("returns the user's tasks with that tag, and nothing for someone else's tag", async () => {
    const home = await listFor(a);
    const work = await listFor(a, "Work");
    const one = await taskFor(a, home.id, "one");
    const two = await taskFor(a, work.id, "two");
    await taskFor(a, home.id, "untagged");
    const { tag } = await createTag(a.id, "bills");
    await setTaskTags(a.id, one.id, [tag.id]);
    await setTaskTags(a.id, two.id, [tag.id]);

    expect(titles(await getTaggedTasks(a.id, tag.id))).toEqual(["one", "two"]);
    expect(await getTaggedTasks(b.id, tag.id)).toEqual([]);
  });

  it("returns nothing for a tag with no tasks", async () => {
    const { tag } = await createTag(a.id, "empty");
    expect(await getTaggedTasks(a.id, tag.id)).toEqual([]);
  });
});

describe("reorderTask (drag and drop)", () => {
  async function seedThree() {
    const list = await listFor(a);
    const one = await taskFor(a, list.id, "one");
    const two = await taskFor(a, list.id, "two");
    const three = await taskFor(a, list.id, "three");
    return { list, one, two, three };
  }
  const order = async (listId: string) =>
    sortByPosition(await getListTasks(a.id, listId)).map((t) => t.title);

  it("puts a task between two neighbours", async () => {
    const { list, one, two, three } = await seedThree();
    await reorderTask(a.id, three.id, { afterId: one.id, beforeId: two.id });
    expect(await order(list.id)).toEqual(["one", "three", "two"]);
  });

  it("moves to the top and to the bottom", async () => {
    const { list, one, two, three } = await seedThree();
    await reorderTask(a.id, three.id, { afterId: null, beforeId: one.id });
    expect(await order(list.id)).toEqual(["three", "one", "two"]);
    await reorderTask(a.id, three.id, { afterId: two.id, beforeId: null });
    expect(await order(list.id)).toEqual(["one", "two", "three"]);
  });

  it("survives many moves in a row", async () => {
    const { list, one, two, three } = await seedThree();
    for (let i = 0; i < 20; i++) {
      await reorderTask(a.id, three.id, { afterId: one.id, beforeId: two.id });
      await reorderTask(a.id, two.id, { afterId: one.id, beforeId: three.id });
    }
    expect(await order(list.id)).toEqual(["one", "two", "three"]);
  });

  it("moves a task into another section of the same list", async () => {
    const { list, one } = await seedThree();
    const section = await createSection(a.id, list.id, "Later");
    const moved = await reorderTask(a.id, one.id, {
      afterId: null,
      beforeId: null,
      sectionId: section?.id ?? null,
    });
    expect(moved?.sectionId).toBe(section?.id);
  });

  it("can clear the section with null, and leaves it alone when omitted", async () => {
    const { list, one } = await seedThree();
    const section = await createSection(a.id, list.id, "Later");
    await reorderTask(a.id, one.id, { sectionId: section?.id ?? null });
    expect((await getTask(a.id, one.id))?.sectionId).toBe(section?.id);
    await reorderTask(a.id, one.id, { afterId: null, beforeId: null });
    expect((await getTask(a.id, one.id))?.sectionId).toBe(section?.id);
    await reorderTask(a.id, one.id, { sectionId: null });
    expect((await getTask(a.id, one.id))?.sectionId).toBeNull();
  });

  it("refuses neighbours from another list, another parent, or itself", async () => {
    const { one, two } = await seedThree();
    const other = await listFor(a, "Other");
    const elsewhere = await taskFor(a, other.id, "elsewhere");
    const child = await taskFor(a, (await getTask(a.id, one.id))?.listId ?? "", "child", {
      parentId: one.id,
    });
    expect(await reorderTask(a.id, one.id, { afterId: elsewhere.id })).toBeNull();
    expect(await reorderTask(a.id, one.id, { beforeId: child.id })).toBeNull();
    expect(await reorderTask(a.id, one.id, { afterId: one.id })).toBeNull();
    expect(await reorderTask(a.id, two.id, { afterId: crypto.randomUUID() })).toBeNull();
  });

  it("refuses a section from another list", async () => {
    const { one } = await seedThree();
    const other = await listFor(a, "Other");
    const section = await createSection(a.id, other.id, "Elsewhere");
    expect(await reorderTask(a.id, one.id, { sectionId: section?.id ?? null })).toBeNull();
  });

  it("copes with out-of-order neighbours by placing the task after the first", async () => {
    const { list, one, two, three } = await seedThree();
    // "after" is actually below "before": the call must not throw.
    const result = await reorderTask(a.id, one.id, { afterId: three.id, beforeId: two.id });
    expect(result).not.toBeNull();
    expect((await order(list.id)).at(-1)).toBe("one");
  });

  it("another user cannot reorder my tasks or use my tasks as neighbours", async () => {
    const { list, one, two } = await seedThree();
    const theirs = await listFor(b);
    const theirTask = await taskFor(b, theirs.id, "theirs");
    expect(await reorderTask(b.id, one.id, { afterId: null, beforeId: two.id })).toBeNull();
    expect(await reorderTask(b.id, theirTask.id, { afterId: one.id })).toBeNull();
    expect(await order(list.id)).toEqual(["one", "two", "three"]);
  });
});

describe("saved view settings", () => {
  it("are stored on the list and read back", async () => {
    const list = await listFor(a);
    const settings = { sort: "due", group: "tag", showCompleted: true };
    expect(await setListViewSettings(a.id, list.id, settings)).toBe(true);
    const [row] = await db.select().from(lists).where(eq(lists.id, list.id));
    expect(parseViewSettings(row.viewSettings)).toMatchObject(settings);
  });

  it("another user cannot change my list's view settings", async () => {
    const list = await listFor(a);
    expect(await setListViewSettings(b.id, list.id, { sort: "priority" })).toBe(false);
    const [row] = await db.select().from(lists).where(eq(lists.id, list.id));
    expect(parseViewSettings(row.viewSettings).sort).toBe("manual");
  });

  it("a trashed list's settings cannot be changed", async () => {
    const list = await listFor(a);
    await trashList(a.id, list.id);
    expect(await setListViewSettings(a.id, list.id, { sort: "due" })).toBe(false);
  });
});
