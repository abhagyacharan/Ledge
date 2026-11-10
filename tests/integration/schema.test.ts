import { and, eq, sql } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/server/db/client";
import { lists, sections, tags, taskTags, tasks, user, userSettings } from "@/server/db/schema";
import { dbError, makeList, makeSection, makeTag, makeTask, PG } from "../helpers/data";
import { createUser, resetAuthData, type TestUser } from "../helpers/fast-users";

let a: TestUser;
let b: TestUser;

beforeEach(async () => {
  process.env.ALLOW_SIGNUP = "true";
  await resetAuthData();
  a = await createUser("a@example.com", "A");
  b = await createUser("b@example.com", "B");
});

describe("new accounts", () => {
  it("get a settings row with the default values", async () => {
    const [settings] = await db.select().from(userSettings).where(eq(userSettings.userId, a.id));
    expect(settings).toMatchObject({
      timezone: "Asia/Kolkata",
      weekStartsOn: 1,
      theme: "system",
      currency: "INR",
      locale: "en-IN",
    });
  });

  it("get exactly one Inbox list", async () => {
    const mine = await db.select().from(lists).where(eq(lists.userId, a.id));
    expect(mine).toHaveLength(1);
    expect(mine[0]).toMatchObject({ name: "Inbox", isInbox: true, isArchived: false });
  });

  it("each get their own Inbox", async () => {
    const inboxes = await db.select().from(lists).where(eq(lists.isInbox, true));
    expect(inboxes.map((l) => l.userId).sort()).toEqual([a.id, b.id].sort());
  });
});

describe("Inbox protection", () => {
  it("cannot be deleted", async () => {
    const error = await dbError(
      db.delete(lists).where(and(eq(lists.userId, a.id), eq(lists.isInbox, true))),
    );
    expect(error.code).toBe(PG.checkViolation);
    expect(error.message).toMatch(/Inbox/);
  });

  it("cannot stop being the Inbox, and a normal list cannot become one", async () => {
    const normal = await makeList(a.id, "Home");
    const demote = await dbError(
      db
        .update(lists)
        .set({ isInbox: false })
        .where(and(eq(lists.userId, a.id), eq(lists.isInbox, true))),
    );
    const promote = await dbError(
      db.update(lists).set({ isInbox: true }).where(eq(lists.id, normal.id)),
    );
    expect(demote.code).toBe(PG.checkViolation);
    expect(promote.code).toBe(PG.checkViolation);
  });

  it("a user cannot have a second Inbox", async () => {
    const error = await dbError(makeList(a.id, "Inbox 2", { isInbox: true }));
    expect(error.code).toBe(PG.uniqueViolation);
  });

  it("cannot be archived", async () => {
    const error = await dbError(
      db
        .update(lists)
        .set({ isArchived: true })
        .where(and(eq(lists.userId, a.id), eq(lists.isInbox, true))),
    );
    expect(error.code).toBe(PG.checkViolation);
  });

  it("is removed together with the account when the user is deleted", async () => {
    await db.delete(user).where(eq(user.id, a.id));
    expect(await db.select().from(lists).where(eq(lists.userId, a.id))).toHaveLength(0);
    expect(await db.select().from(userSettings).where(eq(userSettings.userId, a.id))).toHaveLength(
      0,
    );
    // The other user is untouched.
    expect(await db.select().from(lists).where(eq(lists.userId, b.id))).toHaveLength(1);
  });
});

describe("subtasks are one level deep", () => {
  it("accepts a subtask under a normal task", async () => {
    const list = await makeList(a.id);
    const parent = await makeTask(a.id, list.id, "Parent");
    const child = await makeTask(a.id, list.id, "Child", { parentId: parent.id });
    expect(child.parentId).toBe(parent.id);
  });

  it("rejects a subtask of a subtask", async () => {
    const list = await makeList(a.id);
    const parent = await makeTask(a.id, list.id, "Parent");
    const child = await makeTask(a.id, list.id, "Child", { parentId: parent.id });
    const error = await dbError(makeTask(a.id, list.id, "Grandchild", { parentId: child.id }));
    expect(error.code).toBe(PG.checkViolation);
    expect(error.message).toMatch(/one level/);
  });

  it("rejects turning a task that has subtasks into a subtask", async () => {
    const list = await makeList(a.id);
    const parent = await makeTask(a.id, list.id, "Parent");
    await makeTask(a.id, list.id, "Child", { parentId: parent.id });
    const other = await makeTask(a.id, list.id, "Other");
    const error = await dbError(
      db.update(tasks).set({ parentId: other.id }).where(eq(tasks.id, parent.id)),
    );
    expect(error.code).toBe(PG.checkViolation);
  });

  it("rejects a task that is its own parent", async () => {
    const list = await makeList(a.id);
    const task = await makeTask(a.id, list.id);
    const error = await dbError(
      db.update(tasks).set({ parentId: task.id }).where(eq(tasks.id, task.id)),
    );
    expect(error.code).toBe(PG.checkViolation);
  });

  it("rejects a subtask in a different list from its parent", async () => {
    const one = await makeList(a.id, "One");
    const two = await makeList(a.id, "Two");
    const parent = await makeTask(a.id, one.id, "Parent");
    const error = await dbError(makeTask(a.id, two.id, "Child", { parentId: parent.id }));
    expect(error.code).toBe(PG.checkViolation);
    expect(error.message).toMatch(/same list/);
  });

  it("deleting a parent deletes its subtasks", async () => {
    const list = await makeList(a.id);
    const parent = await makeTask(a.id, list.id, "Parent");
    await makeTask(a.id, list.id, "Child", { parentId: parent.id });
    await db.delete(tasks).where(eq(tasks.id, parent.id));
    expect(await db.select().from(tasks).where(eq(tasks.listId, list.id))).toHaveLength(0);
  });
});

describe("task field rules", () => {
  it.each([
    ["an empty title", { title: "" }],
    ["a title over 500 characters", { title: "x".repeat(501) }],
    ["a priority above 3", { priority: 4 }],
    ["a negative priority", { priority: -1 }],
    ["done without a completion time", { status: "done" as const }],
    ["a completion time on an open task", { completedAt: new Date() }],
    ["a due time without a due date", { dueTime: "09:00" }],
  ])("rejects %s", async (_label, overrides) => {
    const list = await makeList(a.id);
    const error = await dbError(makeTask(a.id, list.id, "ok", overrides));
    expect(error.code).toBe(PG.checkViolation);
  });

  it("accepts a title of exactly 500 characters, and every priority from 0 to 3", async () => {
    const list = await makeList(a.id);
    await makeTask(a.id, list.id, "x".repeat(500));
    for (const priority of [0, 1, 2, 3])
      await makeTask(a.id, list.id, `p${priority}`, { priority });
  });

  it("accepts a done task with a completion time, and floating due date and time", async () => {
    const list = await makeList(a.id);
    const done = await makeTask(a.id, list.id, "Done", { status: "done", completedAt: new Date() });
    const dated = await makeTask(a.id, list.id, "Dated", {
      dueDate: "2026-03-29",
      dueTime: "09:30",
    });
    expect(done.status).toBe("done");
    expect(dated).toMatchObject({ dueDate: "2026-03-29", dueTime: "09:30:00" });
  });

  it("rejects an empty list name and a list name over 100 characters", async () => {
    expect((await dbError(makeList(a.id, ""))).code).toBe(PG.checkViolation);
    expect((await dbError(makeList(a.id, "x".repeat(101)))).code).toBe(PG.checkViolation);
  });

  it("rejects an invalid view mode and invalid settings values", async () => {
    expect((await dbError(makeList(a.id, "Bad", { viewMode: "grid" }))).code).toBe(
      PG.checkViolation,
    );
    const bad = await dbError(
      db.update(userSettings).set({ weekStartsOn: 9 }).where(eq(userSettings.userId, a.id)),
    );
    expect(bad.code).toBe(PG.checkViolation);
    const badCurrency = await dbError(
      db.update(userSettings).set({ currency: "rupee" }).where(eq(userSettings.userId, a.id)),
    );
    expect(badCurrency.code).toBe(PG.checkViolation);
  });
});

describe("full-text search column", () => {
  it("is generated from the title and notes", async () => {
    const list = await makeList(a.id);
    await makeTask(a.id, list.id, "Buy groceries", { notes: "milk and eggs" });
    await makeTask(a.id, list.id, "Pay rent");

    const byTitle = await db
      .select({ title: tasks.title })
      .from(tasks)
      .where(sql`${tasks.search} @@ plainto_tsquery('english', 'groceries')`);
    const byNotes = await db
      .select({ title: tasks.title })
      .from(tasks)
      .where(sql`${tasks.search} @@ plainto_tsquery('english', 'eggs')`);
    expect(byTitle.map((r) => r.title)).toEqual(["Buy groceries"]);
    expect(byNotes.map((r) => r.title)).toEqual(["Buy groceries"]);
  });

  it("updates when the title changes", async () => {
    const list = await makeList(a.id);
    const task = await makeTask(a.id, list.id, "Old words");
    await db.update(tasks).set({ title: "Fresh words" }).where(eq(tasks.id, task.id));
    const hits = await db
      .select({ id: tasks.id })
      .from(tasks)
      .where(sql`${tasks.search} @@ plainto_tsquery('english', 'fresh')`);
    expect(hits).toHaveLength(1);
  });

  it("cannot be written by the application", async () => {
    const list = await makeList(a.id);
    const error = await dbError(
      db.execute(
        sql`insert into tasks (user_id, list_id, title, position, search) values (${a.id}, ${list.id}, 't', 'a0', to_tsvector('x'))`,
      ),
    );
    expect(error.code).toBe(PG.generatedColumnWrite);
  });
});

describe("tags", () => {
  it("are unique per user ignoring case", async () => {
    await makeTag(a.id, "Home");
    const error = await dbError(makeTag(a.id, "home"));
    expect(error.code).toBe(PG.uniqueViolation);
  });

  it("can have the same name for different users", async () => {
    await makeTag(a.id, "home");
    await makeTag(b.id, "home");
    expect(await db.select().from(tags).where(eq(tags.name, "home"))).toHaveLength(2);
  });

  it("link to tasks, and deleting the tag only removes the link", async () => {
    const list = await makeList(a.id);
    const task = await makeTask(a.id, list.id);
    const tag = await makeTag(a.id, "bills");
    await db.insert(taskTags).values({ userId: a.id, taskId: task.id, tagId: tag.id });
    await db.delete(tags).where(eq(tags.id, tag.id));
    expect(await db.select().from(taskTags).where(eq(taskTags.taskId, task.id))).toHaveLength(0);
    expect(await db.select().from(tasks).where(eq(tasks.id, task.id))).toHaveLength(1);
  });

  it("cannot be attached to the same task twice", async () => {
    const list = await makeList(a.id);
    const task = await makeTask(a.id, list.id);
    const tag = await makeTag(a.id, "bills");
    await db.insert(taskTags).values({ userId: a.id, taskId: task.id, tagId: tag.id });
    const error = await dbError(
      db.insert(taskTags).values({ userId: a.id, taskId: task.id, tagId: tag.id }),
    );
    expect(error.code).toBe(PG.uniqueViolation);
  });
});

describe("sections and lists cleanup", () => {
  it("deleting a section moves its tasks to no section", async () => {
    const list = await makeList(a.id);
    const section = await makeSection(a.id, list.id);
    const task = await makeTask(a.id, list.id, "Task", { sectionId: section.id });
    await db.delete(sections).where(eq(sections.id, section.id));
    const [after] = await db.select().from(tasks).where(eq(tasks.id, task.id));
    expect(after.sectionId).toBeNull();
  });

  it("deleting a list deletes its sections and tasks", async () => {
    const list = await makeList(a.id);
    const section = await makeSection(a.id, list.id);
    await makeTask(a.id, list.id, "Task", { sectionId: section.id });
    await db.delete(lists).where(eq(lists.id, list.id));
    expect(await db.select().from(sections).where(eq(sections.listId, list.id))).toHaveLength(0);
    expect(await db.select().from(tasks).where(eq(tasks.listId, list.id))).toHaveLength(0);
  });

  it("rejects a section that belongs to a different list than the task", async () => {
    const one = await makeList(a.id, "One");
    const two = await makeList(a.id, "Two");
    const section = await makeSection(a.id, one.id);
    const error = await dbError(makeTask(a.id, two.id, "Task", { sectionId: section.id }));
    expect(error.code).toBe(PG.checkViolation);
  });
});

describe("one user can never point at another user's rows", () => {
  it("a task cannot be put in someone else's list", async () => {
    const theirs = await makeList(a.id, "Theirs");
    const error = await dbError(makeTask(b.id, theirs.id, "Sneaky"));
    expect(error.code).toBe(PG.foreignKeyViolation);
  });

  it("a section cannot be put in someone else's list", async () => {
    const theirs = await makeList(a.id, "Theirs");
    const error = await dbError(makeSection(b.id, theirs.id));
    expect(error.code).toBe(PG.foreignKeyViolation);
  });

  it("a task cannot use someone else's section", async () => {
    const theirList = await makeList(a.id, "Theirs");
    const theirSection = await makeSection(a.id, theirList.id);
    const myList = await makeList(b.id, "Mine");
    const error = await dbError(
      makeTask(b.id, myList.id, "Sneaky", { sectionId: theirSection.id }),
    );
    expect(error.code).toBe(PG.checkViolation);
  });

  it("a task cannot be a subtask of someone else's task", async () => {
    const theirList = await makeList(a.id, "Theirs");
    const theirTask = await makeTask(a.id, theirList.id);
    const myList = await makeList(b.id, "Mine");
    const error = await dbError(makeTask(b.id, myList.id, "Sneaky", { parentId: theirTask.id }));
    expect(error.code).toBe(PG.checkViolation);
  });

  it("a task cannot be tagged with someone else's tag, or a tag put on someone else's task", async () => {
    const theirList = await makeList(a.id, "Theirs");
    const theirTask = await makeTask(a.id, theirList.id);
    const theirTag = await makeTag(a.id, "theirs");
    const myList = await makeList(b.id, "Mine");
    const myTask = await makeTask(b.id, myList.id);
    const myTag = await makeTag(b.id, "mine");

    const otherTag = await dbError(
      db.insert(taskTags).values({ userId: b.id, taskId: myTask.id, tagId: theirTag.id }),
    );
    const otherTask = await dbError(
      db.insert(taskTags).values({ userId: b.id, taskId: theirTask.id, tagId: myTag.id }),
    );
    expect(otherTag.code).toBe(PG.foreignKeyViolation);
    expect(otherTask.code).toBe(PG.foreignKeyViolation);
  });

  it("a completed snapshot cannot point at someone else's recurring task", async () => {
    const theirList = await makeList(a.id, "Theirs");
    const theirTask = await makeTask(a.id, theirList.id);
    const myList = await makeList(b.id, "Mine");
    const error = await dbError(
      makeTask(b.id, myList.id, "Snapshot", {
        status: "done",
        completedAt: new Date(),
        recurrenceOriginId: theirTask.id,
      }),
    );
    expect(error.code).toBe(PG.checkViolation);
  });
});
