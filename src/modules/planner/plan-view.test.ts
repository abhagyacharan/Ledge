import { describe, expect, it } from "vitest";
import {
  costWords,
  countByFilter,
  daysLeftText,
  draftStepText,
  groupByPhase,
  groupFeatures,
  inFilter,
  monthAiLine,
  parseFilter,
  parseRupees,
  planAiLine,
  plansHint,
  progressLine,
  progressPercent,
  rupeesText,
  visibleTasks,
} from "./plan-view";

describe("filters", () => {
  it("reads the status from the URL and defaults to active", () => {
    expect(parseFilter("done")).toBe("done");
    expect(parseFilter(["archived", "x"])).toBe("archived");
    expect(parseFilter("nonsense")).toBe("active");
    expect(parseFilter(undefined)).toBe("active");
  });

  it("shows drafts under Active as well as under Drafts", () => {
    expect(inFilter({ status: "draft" }, "active")).toBe(true);
    expect(inFilter({ status: "draft" }, "drafts")).toBe(true);
    expect(inFilter({ status: "active" }, "drafts")).toBe(false);
    expect(inFilter({ status: "done" }, "active")).toBe(false);
  });

  it("counts like the design (3 active with one draft)", () => {
    const counts = countByFilter([
      { status: "draft" },
      { status: "active" },
      { status: "active" },
      { status: "done" },
    ]);
    expect(counts).toEqual({ active: 3, drafts: 1, done: 1, archived: 0 });
  });
});

describe("draftStepText", () => {
  const base = { step: "questions" as const, questions: [{}, {}, {}, {}, {}], followups: null };
  it("names the question being answered", () => {
    expect(draftStepText({ ...base, answers: [{ questionId: "q1" }, { questionId: "q2" }] })).toBe(
      "Draft · question 3 of 5",
    );
  });
  it("never goes past the last question", () => {
    const answers = ["q1", "q2", "q3", "q4", "q5"].map((questionId) => ({ questionId }));
    expect(draftStepText({ ...base, answers })).toBe("Draft · question 5 of 5");
  });
  it("counts follow-ups apart from the first round", () => {
    expect(
      draftStepText({
        step: "followups",
        questions: [{}, {}],
        followups: [{}, {}, {}],
        answers: [{ questionId: "q1" }, { questionId: "q2" }, { questionId: "f1" }],
      }),
    ).toBe("Draft · follow-up 2 of 3");
  });
  it("covers the other steps", () => {
    const rest = { questions: null, followups: null, answers: [] };
    expect(draftStepText({ ...rest, step: "basics" })).toBe("Draft · the basics");
    expect(draftStepText({ ...rest, step: null })).toBe("Draft · the basics");
    expect(draftStepText({ ...rest, step: "making" })).toBe("Draft · making the plan");
    expect(draftStepText({ ...rest, step: "review" })).toBe("Draft · ready to review");
  });
});

describe("progress words", () => {
  it("rounds the percent and holds 100 for finished", () => {
    expect(progressPercent(4, 18)).toBe(22);
    expect(progressPercent(0, 0)).toBe(0);
    expect(progressPercent(199, 200)).toBe(99);
    expect(progressPercent(20, 20)).toBe(100);
  });

  it("says how long is left", () => {
    expect(daysLeftText(24)).toBe("24 days left");
    expect(daysLeftText(1)).toBe("1 day left");
    expect(daysLeftText(0)).toBe("Last day");
    expect(daysLeftText(-1)).toBe("Ended yesterday");
    expect(daysLeftText(-3)).toBe("Ended 3 days ago");
    expect(daysLeftText(null)).toBeNull();
  });

  it("builds the card and page lines", () => {
    expect(progressLine(4, 18, 24)).toBe("4 of 18 · 24 days left");
    expect(progressLine(4, 18, 24, { word: true })).toBe("4 of 18 done · 24 days left");
    expect(progressLine(20, 20, -3, { word: true, finished: true })).toBe("20 of 20 done");
    expect(progressLine(2, 5, null)).toBe("2 of 5");
  });
});

describe("groupByPhase", () => {
  const phases = [
    { id: "p1", name: "Week 1" },
    { id: "p2", name: "Week 2" },
  ];
  const t = (
    id: string,
    planPhase: string | null,
    status: "open" | "done" = "open",
    parentId = null as string | null,
  ) => ({
    id,
    planPhase,
    status,
    parentId,
  });

  it("groups top-level tasks by phase, leaves subtasks out and counts done", () => {
    const groups = groupByPhase(phases, [
      t("a", "p1", "done"),
      t("a1", "p1", "open", "a"),
      t("b", "p1"),
      t("c", "p2"),
    ]);
    expect(groups.map((g) => [g.id, g.total, g.done])).toEqual([
      ["p1", 2, 1],
      ["p2", 1, 0],
    ]);
  });

  it("keeps empty phases and adds Other only when needed", () => {
    expect(groupByPhase(phases, []).map((g) => g.id)).toEqual(["p1", "p2"]);
    const withStray = groupByPhase(phases, [t("x", "gone"), t("y", null)]);
    expect(withStray.map((g) => g.id)).toEqual(["p1", "p2", "other"]);
    expect(withStray[2].total).toBe(2);
  });
});

describe("visibleTasks", () => {
  const make = (n: number, done = 0) =>
    Array.from({ length: n }, (_, i) => ({
      id: String(i),
      parentId: null,
      planPhase: "p",
      status: (i < done ? "done" : "open") as "open" | "done",
    }));

  it("folds done tasks on desktop while something is open", () => {
    const r = visibleTasks(make(6, 3), {
      desktop: true,
      showDone: false,
      expanded: false,
      folding: true,
    });
    expect(r.shown).toHaveLength(3);
    expect(r.hiddenDone).toBe(3);
    const shown = visibleTasks(make(6, 3), {
      desktop: true,
      showDone: true,
      expanded: false,
      folding: true,
    });
    expect(shown.shown).toHaveLength(6);
  });

  it("shows a finished phase in full", () => {
    const r = visibleTasks(make(3, 3), {
      desktop: true,
      showDone: false,
      expanded: false,
      folding: true,
    });
    expect(r.shown).toHaveLength(3);
    expect(r.hiddenDone).toBe(0);
  });

  it("folds the tail of a long phase on a phone", () => {
    const r = visibleTasks(make(9), {
      desktop: false,
      showDone: false,
      expanded: false,
      folding: true,
    });
    expect(r.shown).toHaveLength(5);
    expect(r.hiddenMore).toBe(4);
    expect(
      visibleTasks(make(7), { desktop: false, showDone: false, expanded: false, folding: true })
        .hiddenMore,
    ).toBe(0);
    expect(
      visibleTasks(make(9), { desktop: false, showDone: false, expanded: true, folding: true })
        .shown,
    ).toHaveLength(9);
  });

  it("never folds a finished plan", () => {
    const r = visibleTasks(make(9, 4), {
      desktop: true,
      showDone: false,
      expanded: false,
      folding: false,
    });
    expect(r.shown).toHaveLength(9);
  });
});

describe("AI cost words", () => {
  it("says about, in dollars and rupees", () => {
    expect(costWords(4000, 8500)).toBe("about $0.004 (₹0.34)");
    expect(planAiLine({ requests: 4, tokens: 9800, costMicros: 4000 }, 8500)).toBe(
      "4 requests · 9,800 tokens · about $0.004 (₹0.34)",
    );
    expect(planAiLine({ requests: 1, tokens: 500, costMicros: 0 }, 8500)).toBe(
      "1 request · 500 tokens · about $0 (₹0)",
    );
  });

  it("builds the month line", () => {
    expect(monthAiLine(9, 7000)).toBe("9 requests · about $0.007");
    expect(monthAiLine(1, 0)).toBe("1 request · about $0");
  });

  it("groups features into Voice and Planner", () => {
    const g = groupFeatures([
      {
        feature: "voice_transcribe",
        requests: 3,
        inputTokens: 0,
        outputTokens: 0,
        costMicros: 100,
      },
      {
        feature: "voice_understand",
        requests: 2,
        inputTokens: 1500,
        outputTokens: 600,
        costMicros: 2900,
      },
      {
        feature: "plan_make",
        requests: 1,
        inputTokens: 4000,
        outputTokens: 5000,
        costMicros: 3600,
      },
      {
        feature: "plan_questions",
        requests: 1,
        inputTokens: 400,
        outputTokens: 200,
        costMicros: 180,
      },
    ]);
    expect(g.voice).toEqual({ requests: 5, tokens: 2100, costMicros: 3000 });
    expect(g.planner).toEqual({ requests: 2, tokens: 9600, costMicros: 3780 });
    expect(g.total).toEqual({ requests: 7, tokens: 11700, costMicros: 6780 });
  });

  it("handles no usage", () => {
    expect(groupFeatures([]).total).toEqual({ requests: 0, tokens: 0, costMicros: 0 });
  });
});

describe("rupees field", () => {
  it("shows paise as rupees", () => {
    expect(rupeesText(8500)).toBe("85");
    expect(rupeesText(8550)).toBe("85.5");
  });
  it("parses sensible rates only", () => {
    expect(parseRupees("85")).toBe(8500);
    expect(parseRupees("₹ 85.25".replace(" ", ""))).toBe(8525);
    expect(parseRupees("1,000")).toBe(100000);
    expect(parseRupees("0")).toBeNull();
    expect(parseRupees("85.255")).toBeNull();
    expect(parseRupees("abc")).toBeNull();
    expect(parseRupees("1001")).toBeNull();
  });
});

describe("plansHint", () => {
  it("invites when there are no active plans", () => {
    expect(plansHint([]).line).toBe("Plan a goal and turn it into tasks");
  });

  it("names the one plan with its progress and next task", () => {
    const hint = plansHint([
      { title: "Freelancing", done: 4, total: 18, next: "Write your pitch" },
    ]);
    expect(hint.line).toBe("Freelancing · 4 of 18 done · next: Write your pitch");
    expect(hint.figure).toBe("4 of 18");
  });

  it("leaves out next when there is none, and says when all is done", () => {
    expect(plansHint([{ title: "Run a 5k", done: 2, total: 9, next: null }]).line).toBe(
      "Run a 5k · 2 of 9 done",
    );
    expect(plansHint([{ title: "Run a 5k", done: 9, total: 9, next: null }]).sub).toBe(
      "Run a 5k, all done",
    );
  });

  it("counts several plans and names the most recent one's next task", () => {
    const hint = plansHint([
      { title: "Freelancing", done: 4, total: 18, next: "Write your pitch" },
      { title: "Photography", done: 8, total: 12, next: "Shoot a roll" },
    ]);
    expect(hint.line).toBe("2 plans · next: Write your pitch");
    expect(hint.figure).toBe("2 plans");
  });
});

describe("what you told Ledge", () => {
  it("words the plan length and the time", async () => {
    const { lengthWords, timeWords } = await import("./plan-view");
    expect(lengthWords({ length: "1m", minutesPerDay: 30 }, (d) => d)).toBe("1 month");
    expect(
      lengthWords({ length: { date: "2026-12-21" }, minutesPerDay: 30 }, (d) => `<${d}>`),
    ).toBe("Until <2026-12-21>");
    expect(timeWords({ length: "1w", minutesPerDay: 30 })).toBe("30 min a day");
    expect(timeWords({ length: "1w", minutesPerDay: 60 })).toBe("1 hour a day");
    expect(timeWords({ length: "1w", minutesPerDay: 120 })).toBe("2+ hours a day");
    expect(timeWords({ length: "1w", minutesPerDay: "weekends" })).toBe("Weekends only");
  });

  it("words each answer, skips included", async () => {
    const { answerText } = await import("./plan-view");
    expect(answerText({ kind: "single", value: "Landing pages", custom: null })).toEqual({
      text: "Landing pages",
      mono: false,
    });
    expect(answerText({ kind: "multi", value: ["A", "B"], custom: "C" }).text).toBe("A, B, C");
    expect(answerText({ kind: "scale", value: 2, custom: null })).toEqual({
      text: "2 of 5",
      mono: true,
    });
    expect(answerText({ kind: "text", value: "  Cold calls ", custom: null }).text).toBe(
      "Cold calls",
    );
    expect(answerText({ kind: "single", value: null, custom: null }).text).toBe("Skipped");
    expect(answerText({ kind: "single", value: null, custom: "My own" }).text).toBe("My own");
  });
});

describe("toldRows", () => {
  it("lists the basics, then each question in order", async () => {
    const { toldRows } = await import("./plan-view");
    const rows = toldRows({ length: "1 month", time: "30 min a day" }, [
      { question: "What kind?", kind: "single", value: "Landing pages", custom: null },
      { question: "Skill?", kind: "scale", value: 2, custom: null },
      { question: "Avoid?", kind: "text", value: null, custom: null },
    ]);
    expect(rows.map((r) => [r.label, r.text, r.mono])).toEqual([
      ["Plan length", "1 month", false],
      ["Time you can give it", "30 min a day", false],
      ["What kind?", "Landing pages", false],
      ["Skill?", "2 of 5", true],
      ["Avoid?", "Skipped", false],
    ]);
  });
});
