import { and, eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { sortByPosition } from "@/lib/ordering";
import {
  createList,
  deleteListForever,
  getInbox,
  getList,
  listArchivedLists,
  listLists,
  listTrashedLists,
  moveList,
  restoreList,
  setListArchived,
  trashList,
  updateList,
} from "@/server/data/lists";
import { getUserSettings } from "@/server/data/settings";
import {
  createTask,
  getListTasks,
  getTask,
  getTaskDetail,
  moveTaskToList,
  restoreTask,
  setTaskDone,
  trashTask,
  updateTask,
} from "@/server/data/tasks";
import { db } from "@/server/db/client";
import { tasks, userSettings } from "@/server/db/schema";
import { createUser, resetAuthData, type TestUser } from "../helpers/fast-users";

let a: TestUser;

beforeEach(async () => {
  process.env.ALLOW_SIGNUP = "true";
  await resetAuthData();
  a = await createUser("a@example.com", "A");
});

/** Creates a list and returns it, failing the test if the data layer returns nothing. */
async function newList(name = "List") {
  return createList(a.id, { name });
}

async function newTask(listId: string, title = "Task", extra = {}) {
  const task = await createTask(a.id, { listId, title, ...extra });
  if (!task) throw new Error("expected the task to be created");
  return task;
}

describe("lists", () => {
  it("are created at the end, after General (the inbox)", async () => {
    const one = await newList("One");
    const two = await newList("Two");
    const all = await listLists(a.id);
    expect(all.map((l) => l.name)).toEqual(["General", "One", "Two"]);
    expect(one.position < two.position).toBe(true);
  });

  it("can be edited: name, icon, colour, description and target date", async () => {
    const list = await newList("Old");
    const updated = await updateList(a.id, list.id, {
      name: "New",
      icon: "🌱",
      color: "#10b981",
      description: "Goal list",
      targetDate: "2026-12-31",
    });
    expect(updated).toMatchObject({
      name: "New",
      icon: "🌱",
      color: "#10b981",
      description: "Goal list",
      targetDate: "2026-12-31",
    });
  });

  it("can be moved up and down", async () => {
    const one = await newList("One");
    const two = await newList("Two");
    expect(await moveList(a.id, two.id, "up")).toBe(true);
    expect((await listLists(a.id)).map((l) => l.name)).toEqual(["General", "Two", "One"]);
    expect(await moveList(a.id, one.id, "up")).toBe(true);
    expect((await listLists(a.id)).map((l) => l.name)).toEqual(["General", "One", "Two"]);
  });

  it("do not move past the ends", async () => {
    const one = await newList("One");
    expect(await moveList(a.id, one.id, "down")).toBe(false);
    const inbox = await getInbox(a.id);
    expect(await moveList(a.id, inbox.id, "up")).toBe(false);
  });

  it("can be archived and unarchived, and archived lists leave the normal listing", async () => {
    const list = await newList("Old project");
    await setListArchived(a.id, list.id, true);
    expect((await listLists(a.id)).map((l) => l.id)).not.toContain(list.id);
    expect((await listArchivedLists(a.id)).map((l) => l.id)).toEqual([list.id]);
    expect((await listLists(a.id, { includeArchived: true })).map((l) => l.id)).toContain(list.id);
    await setListArchived(a.id, list.id, false);
    expect((await listLists(a.id)).map((l) => l.id)).toContain(list.id);
  });

  it("go to Trash with their tasks, and come back with them", async () => {
    const list = await newList("Doomed");
    const task = await newTask(list.id, "Inside");
    expect(await trashList(a.id, list.id)).toBe(true);

    expect(await getList(a.id, list.id)).toBeNull();
    expect((await getList(a.id, list.id, { includeTrashed: true }))?.deletedAt).not.toBeNull();
    expect((await listLists(a.id)).map((l) => l.id)).not.toContain(list.id);
    expect((await listTrashedLists(a.id)).map((l) => l.id)).toEqual([list.id]);
    expect(await getTask(a.id, task.id)).toBeNull(); // tasks of a trashed list are hidden

    expect(await restoreList(a.id, list.id)).toBe(true);
    expect(await getList(a.id, list.id)).not.toBeNull();
    expect((await getTask(a.id, task.id))?.title).toBe("Inside");
  });

  it("cannot get new tasks, or be edited, while in Trash", async () => {
    const list = await newList("Doomed");
    await trashList(a.id, list.id);
    expect(await createTask(a.id, { listId: list.id, title: "Nope" })).toBeNull();
    expect(await updateList(a.id, list.id, { name: "Renamed" })).toBeNull();
  });

  it("can be deleted forever, taking their tasks along", async () => {
    const list = await newList("Gone");
    const task = await newTask(list.id);
    expect(await deleteListForever(a.id, list.id)).toBe(true);
    const rows = await db.select().from(tasks).where(eq(tasks.id, task.id));
    expect(rows).toHaveLength(0);
  });

  it("never lets the Inbox be trashed, archived or deleted", async () => {
    const inbox = await getInbox(a.id);
    await expect(trashList(a.id, inbox.id)).rejects.toThrow();
    await expect(setListArchived(a.id, inbox.id, true)).rejects.toThrow();
    await expect(deleteListForever(a.id, inbox.id)).rejects.toThrow();
  });
});

describe("settings and the Inbox repair themselves", () => {
  it("recreates a missing settings row with the defaults", async () => {
    await db.delete(userSettings).where(eq(userSettings.userId, a.id));
    const settings = await getUserSettings(a.id);
    expect(settings).toMatchObject({ timezone: "Asia/Kolkata", currency: "INR", locale: "en-IN" });
  });

  it("returns the same Inbox every time", async () => {
    const first = await getInbox(a.id);
    const second = await getInbox(a.id);
    expect(second.id).toBe(first.id);
    expect(first.isInbox).toBe(true);
  });
});

describe("creating tasks", () => {
  it("puts new tasks at the end", async () => {
    const list = await newList();
    const one = await newTask(list.id, "One");
    const two = await newTask(list.id, "Two");
    const three = await newTask(list.id, "Three");
    const ordered = sortByPosition(await getListTasks(a.id, list.id));
    expect(ordered.map((t) => t.id)).toEqual([one.id, two.id, three.id]);
  });

  it("keeps floating dates as plain strings and drops a time that has no date", async () => {
    const list = await newList();
    const dated = await newTask(list.id, "Dated", { dueDate: "2026-03-29", dueTime: "09:30" });
    const timeOnly = await newTask(list.id, "Time only", { dueTime: "09:30" });
    expect(dated).toMatchObject({ dueDate: "2026-03-29", dueTime: "09:30:00" });
    expect(timeOnly).toMatchObject({ dueDate: null, dueTime: null });
  });

  it("creates a subtask in its parent's list", async () => {
    const list = await newList();
    const other = await newList("Other");
    const parent = await newTask(list.id, "Parent");
    const child = await newTask(other.id, "Child", { parentId: parent.id });
    expect(child).toMatchObject({ listId: list.id, parentId: parent.id });
  });

  it("refuses a subtask of a subtask", async () => {
    const list = await newList();
    const parent = await newTask(list.id);
    const child = await newTask(list.id, "Child", { parentId: parent.id });
    expect(
      await createTask(a.id, { listId: list.id, title: "Deep", parentId: child.id }),
    ).toBeNull();
  });
});

describe("updating tasks", () => {
  it("changes title, notes and priority", async () => {
    const list = await newList();
    const task = await newTask(list.id);
    const updated = await updateTask(a.id, task.id, {
      title: "New",
      notes: "Details",
      priority: 3,
    });
    expect(updated).toMatchObject({ title: "New", notes: "Details", priority: 3 });
    const cleared = await updateTask(a.id, task.id, { notes: null });
    expect(cleared?.notes).toBeNull();
  });

  it("clearing the due date also clears the due time", async () => {
    const list = await newList();
    const task = await newTask(list.id, "T", { dueDate: "2026-11-10", dueTime: "08:00" });
    const cleared = await updateTask(a.id, task.id, { dueDate: null });
    expect(cleared).toMatchObject({ dueDate: null, dueTime: null });
  });

  it("sets a time only when the task has a date", async () => {
    const list = await newList();
    const task = await newTask(list.id);
    const noDate = await updateTask(a.id, task.id, { dueTime: "08:00" });
    expect(noDate?.dueTime).toBeNull();
    const withDate = await updateTask(a.id, task.id, { dueDate: "2026-11-10", dueTime: "08:00" });
    expect(withDate).toMatchObject({ dueDate: "2026-11-10", dueTime: "08:00:00" });
  });
});

describe("completing tasks", () => {
  it("sets and clears the completion time", async () => {
    const list = await newList();
    const task = await newTask(list.id);
    const done = await setTaskDone(a.id, task.id, true);
    expect(done?.status).toBe("done");
    expect(done?.completedAt).toBeInstanceOf(Date);
    const reopened = await setTaskDone(a.id, task.id, false);
    expect(reopened).toMatchObject({ status: "open", completedAt: null });
  });

  it("completing every subtask does not complete the parent", async () => {
    const list = await newList();
    const parent = await newTask(list.id, "Parent");
    const one = await newTask(list.id, "One", { parentId: parent.id });
    const two = await newTask(list.id, "Two", { parentId: parent.id });
    await setTaskDone(a.id, one.id, true);
    await setTaskDone(a.id, two.id, true);
    expect((await getTask(a.id, parent.id))?.status).toBe("open");
    const detail = await getTaskDetail(a.id, parent.id);
    expect(detail?.subtasks.filter((s) => s.status === "done")).toHaveLength(2);
  });
});

describe("moving tasks between lists", () => {
  it("moves a task with its subtasks", async () => {
    const from = await newList("From");
    const to = await newList("To");
    const parent = await newTask(from.id, "Parent");
    const child = await newTask(from.id, "Child", { parentId: parent.id });

    const moved = await moveTaskToList(a.id, parent.id, to.id);
    expect(moved).toMatchObject({ listId: to.id });
    expect((await getTask(a.id, child.id))?.listId).toBe(to.id);
    expect((await getTask(a.id, child.id))?.parentId).toBe(parent.id);
    expect(await getListTasks(a.id, from.id)).toHaveLength(0);
    expect(await getListTasks(a.id, to.id)).toHaveLength(2);
  });

  it("refuses to move a subtask on its own, and to move into a missing list", async () => {
    const one = await newList("One");
    const two = await newList("Two");
    const parent = await newTask(one.id);
    const child = await newTask(one.id, "Child", { parentId: parent.id });
    expect(await moveTaskToList(a.id, child.id, two.id)).toBeNull();
    expect(await moveTaskToList(a.id, parent.id, crypto.randomUUID())).toBeNull();
  });
});

describe("Trash for tasks", () => {
  it("trashes a task with its subtasks, and restores exactly those", async () => {
    const list = await newList();
    const parent = await newTask(list.id, "Parent");
    const child = await newTask(list.id, "Child", { parentId: parent.id });
    const earlier = await newTask(list.id, "Trashed earlier", { parentId: parent.id });
    await trashTask(a.id, earlier.id);

    expect(await trashTask(a.id, parent.id)).toBe(true);
    expect(await getListTasks(a.id, list.id)).toHaveLength(0);

    expect(await restoreTask(a.id, parent.id)).toBe(true);
    const visible = (await getListTasks(a.id, list.id)).map((t) => t.id).sort();
    expect(visible).toEqual([parent.id, child.id].sort()); // the earlier-trashed subtask stays in Trash
  });

  it("cannot trash twice or restore something that is not trashed", async () => {
    const list = await newList();
    const task = await newTask(list.id);
    expect(await restoreTask(a.id, task.id)).toBe(false);
    expect(await trashTask(a.id, task.id)).toBe(true);
    expect(await trashTask(a.id, task.id)).toBe(false);
  });
});

describe("task detail", () => {
  it("includes subtasks in order, and hides trashed subtasks", async () => {
    const list = await newList();
    const parent = await newTask(list.id, "Parent");
    const one = await newTask(list.id, "One", { parentId: parent.id });
    const two = await newTask(list.id, "Two", { parentId: parent.id });
    const gone = await newTask(list.id, "Gone", { parentId: parent.id });
    await trashTask(a.id, gone.id);
    const detail = await getTaskDetail(a.id, parent.id);
    expect(detail?.subtasks.map((s) => s.id)).toEqual([one.id, two.id]);
    expect(
      await db
        .select({ id: tasks.id })
        .from(tasks)
        .where(and(eq(tasks.parentId, parent.id), eq(tasks.userId, a.id))),
    ).toHaveLength(3);
  });
});
