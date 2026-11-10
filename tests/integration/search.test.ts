import { beforeEach, describe, expect, it } from "vitest";
import { createList, setListArchived, trashList } from "@/server/data/lists";
import { trashTask } from "@/server/data/tasks";
import { searchTasks } from "@/server/data/views";
import { makeTask } from "../helpers/data";
import { createUser, resetAuthData, type TestUser } from "../helpers/fast-users";

let a: TestUser;
let b: TestUser;

beforeEach(async () => {
  process.env.ALLOW_SIGNUP = "true";
  await resetAuthData();
  a = await createUser("a@example.com", "A");
  b = await createUser("b@example.com", "B");
});

const titles = async (user: TestUser, text: string) =>
  (await searchTasks(user.id, text)).map((t) => t.title).sort();

describe("search (CLAUDE.md §6.2)", () => {
  it("finds words in titles and in notes", async () => {
    const list = await createList(a.id, { name: "L" });
    await makeTask(a.id, list.id, "Buy groceries");
    await makeTask(a.id, list.id, "Call mom", { notes: "ask about the garden party" });
    await makeTask(a.id, list.id, "Unrelated");
    expect(await titles(a, "groceries")).toEqual(["Buy groceries"]);
    expect(await titles(a, "garden")).toEqual(["Call mom"]);
  });

  it("matches word forms and the start of a word while typing", async () => {
    const list = await createList(a.id, { name: "L" });
    await makeTask(a.id, list.id, "Paying the electricity bill");
    expect(await titles(a, "pay")).toEqual(["Paying the electricity bill"]); // stem
    expect(await titles(a, "electr")).toEqual(["Paying the electricity bill"]); // prefix
  });

  it("needs every word to match, in any order", async () => {
    const list = await createList(a.id, { name: "L" });
    await makeTask(a.id, list.id, "Review pull requests");
    await makeTask(a.id, list.id, "Review taxes");
    expect(await titles(a, "pull review")).toEqual(["Review pull requests"]);
  });

  it("still finds something when the query is only a stop word", async () => {
    const list = await createList(a.id, { name: "L" });
    await makeTask(a.id, list.id, "The plan");
    expect(await titles(a, "the")).toEqual(["The plan"]);
  });

  it("is not fooled by punctuation, SQL or wildcard characters", async () => {
    const list = await createList(a.id, { name: "L" });
    await makeTask(a.id, list.id, "Buy milk");
    expect(await titles(a, 'milk"; DROP TABLE tasks; --')).toEqual([]); // just more words that must all match
    expect(await titles(a, "%")).toEqual([]);
    expect(await titles(a, "   ")).toEqual([]);
    expect(await titles(a, ":* & |")).toEqual([]);
    expect(await titles(a, "milk")).toEqual(["Buy milk"]); // the table is intact
  });

  it("ranks a title match above a notes match", async () => {
    const list = await createList(a.id, { name: "L" });
    await makeTask(a.id, list.id, "Something else", { notes: "remember the passport" });
    await makeTask(a.id, list.id, "Renew passport");
    const found = await searchTasks(a.id, "passport");
    expect(found.map((t) => t.title)).toEqual(["Renew passport", "Something else"]);
  });

  it("never returns another user's tasks", async () => {
    const aList = await createList(a.id, { name: "A" });
    const bList = await createList(b.id, { name: "B" });
    await makeTask(a.id, aList.id, "Secret plan of A");
    await makeTask(b.id, bList.id, "Plan of B");
    expect(await titles(b, "secret")).toEqual([]);
    expect(await titles(b, "plan")).toEqual(["Plan of B"]);
    expect(await titles(a, "plan")).toEqual(["Secret plan of A"]);
  });

  it("leaves out tasks in Trash and tasks in a trashed or archived list", async () => {
    const live = await createList(a.id, { name: "Live" });
    const gone = await createList(a.id, { name: "Gone" });
    const shelf = await createList(a.id, { name: "Shelf" });
    const t = await makeTask(a.id, live.id, "Zebra in trash");
    await makeTask(a.id, live.id, "Zebra kept");
    await makeTask(a.id, gone.id, "Zebra in a deleted list");
    await makeTask(a.id, shelf.id, "Zebra in an archived list");
    await trashTask(a.id, t.id);
    await trashList(a.id, gone.id);
    await setListArchived(a.id, shelf.id, true);
    expect(await titles(a, "zebra")).toEqual(["Zebra kept"]);
  });

  it("carries the list name so a result can say where it lives", async () => {
    const list = await createList(a.id, { name: "Work" });
    await makeTask(a.id, list.id, "Quarterly report");
    const [row] = await searchTasks(a.id, "quarterly");
    expect(row.listName).toBe("Work");
  });
});
