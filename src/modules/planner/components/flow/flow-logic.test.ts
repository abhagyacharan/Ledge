import { describe, expect, it } from "vitest";
import { basicsLine, basicsMinutes, formatTotalTime } from "./basics-line";
import { stepEyebrow, stepProgress } from "./progress";
import { draftStepLabel } from "./step-label";
import type { PlanAnswer, PlanQuestion } from "../../schema";

const today = "2026-11-23"; // a Monday

const q = (id: string): PlanQuestion => ({
  id,
  kind: "text",
  text: id,
  options: [],
  scaleLabels: null,
  because: null,
});
const a = (questionId: string): PlanAnswer => ({
  questionId,
  question: questionId,
  kind: "text",
  value: "x",
  custom: null,
});

describe("draftStepLabel", () => {
  const base = { questions: null, followups: null, answers: [] };
  it("names each step", () => {
    expect(draftStepLabel({ ...base, step: "goal" })).toBe("Draft · goal");
    expect(draftStepLabel({ ...base, step: "basics" })).toBe("Draft · basics");
    expect(draftStepLabel({ ...base, step: "making" })).toBe("Draft · making");
    expect(draftStepLabel({ ...base, step: "review" })).toBe("Draft · ready to review");
    expect(draftStepLabel({ ...base, step: null })).toBe("Draft · ready to review");
  });
  it("counts the next question", () => {
    const questions = [q("q1"), q("q2"), q("q3"), q("q4"), q("q5")];
    expect(draftStepLabel({ ...base, step: "questions", questions })).toBe(
      "Draft · question 1 of 5",
    );
    expect(
      draftStepLabel({ ...base, step: "questions", questions, answers: [a("q1"), a("q2")] }),
    ).toBe("Draft · question 3 of 5");
    expect(
      draftStepLabel({
        ...base,
        step: "questions",
        questions: [q("q1")],
        answers: [a("q1")],
      }),
    ).toBe("Draft · question 1 of 1");
  });
  it("counts follow-ups separately from the main questions", () => {
    expect(
      draftStepLabel({
        ...base,
        step: "followups",
        questions: [q("q1")],
        followups: [q("f1"), q("f2")],
        answers: [a("q1"), a("f1")],
      }),
    ).toBe("Draft · follow-up 2 of 2");
  });
});

describe("stepProgress and stepEyebrow", () => {
  it("grows through the steps", () => {
    const values = [
      stepProgress({ name: "goal" }),
      stepProgress({ name: "basics" }),
      stepProgress({ name: "questions", index: 0, total: 5 }),
      stepProgress({ name: "questions", index: 4, total: 5 }),
      stepProgress({ name: "followups", index: 0, total: 2 }),
      stepProgress({ name: "making" }),
      stepProgress({ name: "review" }),
    ];
    expect([...values].sort((x, y) => x - y)).toEqual(values);
    expect(values[values.length - 1]).toBe(100);
  });
  it("words the eyebrow", () => {
    expect(stepEyebrow({ name: "goal" })).toBe("Step 1 of 4");
    expect(stepEyebrow({ name: "questions", index: 1, total: 5 })).toBe("Question 2 of 5");
    expect(stepEyebrow({ name: "followups", index: 0, total: 2 })).toBe("Follow-up 1 of 2");
  });
});

describe("basics line", () => {
  it("adds up the hours for a month at 30 minutes a day", () => {
    expect(basicsMinutes({ length: "1m", minutesPerDay: 30 }, today)).toBe(900);
    expect(basicsLine({ length: "1m", minutesPerDay: 30 }, today, "en-GB")).toEqual({
      amount: "15 hours",
      range: "Mon 23 Nov to Tue 22 Dec",
    });
  });
  it("counts only weekend days for weekends only", () => {
    // 2 weeks from Mon 23 Nov: Sat 28, Sun 29, Sat 5, Sun 6 -> 4 days
    expect(basicsMinutes({ length: "2w", minutesPerDay: "weekends" }, today)).toBe(240);
  });
  it("is null for a past or too-distant custom date", () => {
    expect(basicsLine({ length: { date: today }, minutesPerDay: 30 }, today, "en-GB")).toBeNull();
    expect(
      basicsLine({ length: { date: "2028-01-01" }, minutesPerDay: 30 }, today, "en-GB"),
    ).toBeNull();
  });
  it("words totals", () => {
    expect(formatTotalTime(45)).toBe("45 minutes");
    expect(formatTotalTime(60)).toBe("1 hour");
    expect(formatTotalTime(105)).toBe("2 hours");
  });
});
