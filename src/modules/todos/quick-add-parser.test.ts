import { describe, expect, it } from "vitest";
import { parseQuickAdd, tokenKey, type ParseContext } from "./quick-add-parser";

// Tuesday 10 November 2026, 10:00.
const ctx: ParseContext = {
  today: "2026-11-10",
  timeNow: "10:00",
  locale: "en-IN",
  lists: [
    { id: "L-home", name: "Home" },
    { id: "L-work", name: "Work" },
    { id: "L-os", name: "Open source" },
  ],
  tags: [
    { id: "T-bills", name: "bills" },
    { id: "T-deep", name: "deep-work" },
  ],
};

describe("the whole sentence from the spec", () => {
  it("pay rent tomorrow 5pm #home @bills p1", () => {
    const r = parseQuickAdd("pay rent tomorrow 5pm #home @bills p1", ctx);
    expect(r.title).toBe("pay rent");
    expect(r.dueDate).toBe("2026-11-11");
    expect(r.dueTime).toBe("17:00");
    expect(r.listId).toBe("L-home");
    expect(r.tagIds).toEqual(["T-bills"]);
    expect(r.priority).toBe(3);
    expect(r.tokens.map((t) => t.kind)).toEqual(["date", "list", "tag", "priority"]);
  });
});

describe("priority", () => {
  it("maps p1 to high, p2 to medium, p3 to low", () => {
    expect(parseQuickAdd("a p1", ctx).priority).toBe(3);
    expect(parseQuickAdd("a p2", ctx).priority).toBe(2);
    expect(parseQuickAdd("a p3", ctx).priority).toBe(1);
  });
  it("is not fooled by p4, words ending in p1, or a priority with no title", () => {
    expect(parseQuickAdd("task p4", ctx).priority).toBeNull();
    expect(parseQuickAdd("task up1", ctx).priority).toBeNull();
    expect(parseQuickAdd("task p1x", ctx).title).toBe("task p1x");
    expect(parseQuickAdd("p1", ctx).title).toBe("p1");
  });
  it("uses the first priority and leaves a second one in the title", () => {
    const r = parseQuickAdd("buy p1 milk p3", ctx);
    expect(r.priority).toBe(3);
    expect(r.title).toBe("buy milk p3");
  });
});

describe("lists", () => {
  it("matches ignoring case, spaces and dashes", () => {
    expect(parseQuickAdd("x #WORK", ctx).listId).toBe("L-work");
    expect(parseQuickAdd("x #open-source", ctx).listId).toBe("L-os");
  });
  it("accepts a unique prefix", () => {
    expect(parseQuickAdd("x #open", ctx).listId).toBe("L-os");
  });
  it("leaves an unknown list in the title", () => {
    const r = parseQuickAdd("x #nowhere", ctx);
    expect(r.listId).toBeNull();
    expect(r.title).toBe("x #nowhere");
  });
  it("does not read a # in the middle of a word", () => {
    expect(parseQuickAdd("issue#home", ctx).listId).toBeNull();
  });
});

describe("tags", () => {
  it("finds existing tags by name, any capitalisation", () => {
    expect(parseQuickAdd("x @BILLS @deep-work", ctx).tagIds).toEqual(["T-bills", "T-deep"]);
  });
  it("marks unknown tags as new, once", () => {
    const r = parseQuickAdd("x @fresh @Fresh", ctx);
    expect(r.tagIds).toEqual([]);
    expect(r.newTagNames).toEqual(["fresh"]);
    expect(r.title).toBe("x");
  });
  it("does not treat an email address as a tag", () => {
    const r = parseQuickAdd("write to bob@example.com", ctx);
    expect(r.tokens).toEqual([]);
  });
});

describe("dates and times", () => {
  it("understands tomorrow, a weekday and a date with a month name", () => {
    const only = parseQuickAdd("tomorrow", ctx);
    expect(only.dueDate).toBeNull(); // only a date and nothing to do: the word stays as the title
    expect(only.title).toBe("tomorrow");
    expect(parseQuickAdd("call mom tomorrow", ctx).dueDate).toBe("2026-11-11");
    expect(parseQuickAdd("call mom friday", ctx).dueDate).toBe("2026-11-13");
    expect(parseQuickAdd("renew passport 25 dec", ctx).dueDate).toBe("2026-12-25");
  });
  it("reads day-first numeric dates for en-IN", () => {
    expect(parseQuickAdd("pay tax 5/12", ctx).dueDate).toBe("2026-12-05");
  });
  it("understands relative phrases", () => {
    expect(parseQuickAdd("review in 3 days", ctx).dueDate).toBe("2026-11-13");
    expect(parseQuickAdd("plan next week", ctx).dueDate).not.toBeNull();
  });
  it("sets a time only when one was written", () => {
    expect(parseQuickAdd("standup tomorrow", ctx).dueTime).toBeNull();
    expect(parseQuickAdd("standup tomorrow 9:30am", ctx).dueTime).toBe("09:30");
    expect(parseQuickAdd("dinner tomorrow at 7pm", ctx).dueTime).toBe("19:00");
  });
  it("a time alone means today, or tomorrow when it has already passed", () => {
    const later = parseQuickAdd("gym 6pm", ctx);
    expect(later.dueDate).toBe("2026-11-10");
    expect(later.dueTime).toBe("18:00");
    const passed = parseQuickAdd("gym 7am", ctx);
    expect(passed.dueDate).toBe("2026-11-11");
    expect(passed.dueTime).toBe("07:00");
  });
  it("handles a date across a month end", () => {
    const r = parseQuickAdd("invoice in 25 days", { ...ctx, today: "2026-11-10" });
    expect(r.dueDate).toBe("2026-12-05");
  });
  it("keeps a plain title untouched", () => {
    const r = parseQuickAdd("Call the dentist", ctx);
    expect(r.title).toBe("Call the dentist");
    expect(r.tokens).toEqual([]);
    expect(r.dueDate).toBeNull();
  });
});

describe("removing a chip", () => {
  it("puts the words back into the title", () => {
    const first = parseQuickAdd("pay rent tomorrow 5pm", ctx);
    const date = first.tokens.find((t) => t.kind === "date");
    expect(date?.raw).toBe("tomorrow 5pm");
    const second = parseQuickAdd("pay rent tomorrow 5pm", {
      ...ctx,
      ignored: new Set([tokenKey(date!)]),
    });
    expect(second.title).toBe("pay rent tomorrow 5pm");
    expect(second.dueDate).toBeNull();
  });
  it("only removes the one token", () => {
    const r = parseQuickAdd("a #home p2", { ...ctx, ignored: new Set(["priority:p2"]) });
    expect(r.listId).toBe("L-home");
    expect(r.priority).toBeNull();
    expect(r.title).toBe("a p2");
  });
});

describe("edge cases", () => {
  it("gives back an empty title for empty input", () => {
    expect(parseQuickAdd("   ", ctx).title).toBe("");
  });
  it("collapses the gaps left by removed words", () => {
    expect(parseQuickAdd("buy   milk   #home    p2", ctx).title).toBe("buy milk");
  });
  it("labels the date chip the way the task row would", () => {
    const r = parseQuickAdd("x tomorrow 5pm", ctx);
    expect(r.tokens[0]?.label).toBe("Tomorrow, 5:00 pm");
  });
});
