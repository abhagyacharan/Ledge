import { describe, expect, it } from "vitest";
import {
  FOLLOWUPS_JSON_SCHEMA,
  MORE_JSON_SCHEMA,
  PLAN_JSON_SCHEMA,
  QUESTIONS_JSON_SCHEMA,
} from "./json-schema";
import {
  buildFollowupsMessage,
  buildMoreMessage,
  buildPlanMessage,
  buildQuestionsMessage,
  describeAnswer,
  FOLLOWUPS_SYSTEM_PROMPT,
  MORE_SYSTEM_PROMPT,
  PLAN_SYSTEM_PROMPT,
  QUESTIONS_SYSTEM_PROMPT,
} from "./prompt";
import { modelMore, modelPlan, modelQuestions, type PlanAnswer, type PlanBasics } from "./schema";

const context = {
  today: "2026-11-22",
  weekday: "Sunday",
  timeZone: "Asia/Kolkata",
  lists: ["Home", "Work"],
};
const basics: PlanBasics = { length: "1m", minutesPerDay: 30 };
const answer = (over: Partial<PlanAnswer> = {}): PlanAnswer => ({
  questionId: "q1",
  question: "Which area?",
  kind: "single",
  value: "Landing pages",
  custom: null,
  ...over,
});

describe("prompt builders", () => {
  it("sends only the date facts, the list names, the goal and the basics", () => {
    const message = buildQuestionsMessage(context, "Start freelancing", basics, "2026-12-21");
    expect(message).toContain('"today":"2026-11-22"');
    expect(message).toContain('"weekday":"Sunday"');
    expect(message).toContain('"timeZone":"Asia/Kolkata"');
    expect(message).toContain('"existingLists":["Home","Work"]');
    expect(message).toContain('"""Start freelancing"""');
    expect(message).toContain("Plan length: 1 month (last day 2026-12-21)");
    expect(message).toContain("Time they can give: 30 minutes a day");
  });

  it("puts every answer, of both rounds, in the plan message", () => {
    const message = buildPlanMessage(context, "Start freelancing", basics, "2026-12-21", [
      answer(),
      answer({ questionId: "q2", question: "Done before?", kind: "multi", value: ["A", "B"] }),
      answer({ questionId: "q3", question: "Level?", kind: "scale", value: 2 }),
      answer({ questionId: "f1", question: "Pitched?", value: null }),
    ]);
    expect(message).toContain("Q: Which area?\nA: Landing pages");
    expect(message).toContain("A: A, B");
    expect(message).toContain("A: 2 of 5");
    expect(message).toContain("A: (skipped)");
    expect(message).toContain("183 days");
  });

  it("keeps typed answers beside the ticked ones", () => {
    expect(describeAnswer(answer({ value: ["A"], custom: "my own" }))).toBe(
      "A (own words: my own)",
    );
    expect(describeAnswer(answer({ value: null, custom: "only mine" }))).toBe(
      "(own words: only mine)",
    );
  });

  it("follow-ups see the first round's answers", () => {
    const message = buildFollowupsMessage(context, "Goal here", basics, null, [answer()]);
    expect(message).toContain("Their answers so far:");
    expect(message).toContain("A: Landing pages");
  });

  it("add more tasks sends only that plan's titles and done state", () => {
    const message = buildMoreMessage(context, {
      goal: "Start freelancing",
      basics,
      endDate: "2026-12-21",
      phases: [{ id: "p1", name: "Offer", startDate: "2026-11-22", endDate: "2026-12-21" }],
      tasks: [{ title: "Write the offer", done: true, phaseId: "p1" }],
    });
    expect(message).toContain('"title":"Write the offer","done":true');
    expect(message).not.toContain("existingLists");
  });

  it("keeps the system prompts fixed and states the limits", () => {
    expect(QUESTIONS_SYSTEM_PROMPT).toContain("3 to 6 questions");
    expect(QUESTIONS_SYSTEM_PROMPT).toContain("Never ask about either");
    expect(FOLLOWUPS_SYSTEM_PROMPT).toContain("0 to 3 follow-up");
    expect(PLAN_SYSTEM_PROMPT).toContain("at most 30");
    expect(PLAN_SYSTEM_PROMPT).toContain("at most 8 per phase");
    expect(PLAN_SYSTEM_PROMPT).toContain("NEVER give a web address");
    expect(PLAN_SYSTEM_PROMPT).toContain("ONE repeating task");
    expect(PLAN_SYSTEM_PROMPT).toContain("the sales side");
    expect(MORE_SYSTEM_PROMPT).toContain("up to 10 new tasks");
    // No per-request data is ever interpolated into a system prompt.
    for (const p of [QUESTIONS_SYSTEM_PROMPT, FOLLOWUPS_SYSTEM_PROMPT, PLAN_SYSTEM_PROMPT]) {
      expect(p).not.toMatch(/2026-/);
    }
  });
});

describe("strict JSON schemas", () => {
  /** Every object lists all its properties as required and forbids extras (Groq strict mode). */
  function strict(schema: unknown): boolean {
    if (typeof schema !== "object" || schema === null) return true;
    const node = schema as Record<string, unknown>;
    if (node.type === "object") {
      const props = Object.keys((node.properties as object) ?? {});
      const required = (node.required as string[]) ?? [];
      if (node.additionalProperties !== false) return false;
      if (props.length !== required.length || !props.every((p) => required.includes(p))) {
        return false;
      }
    }
    return Object.values(node).every((v) => (Array.isArray(v) ? v.every(strict) : strict(v)));
  }

  it("are strict", () => {
    for (const schema of [
      QUESTIONS_JSON_SCHEMA,
      FOLLOWUPS_JSON_SCHEMA,
      PLAN_JSON_SCHEMA,
      MORE_JSON_SCHEMA,
    ]) {
      expect(strict(schema)).toBe(true);
    }
  });

  it("list the same fields as the Zod schemas", () => {
    expect(Object.keys(QUESTIONS_JSON_SCHEMA.properties)).toEqual(
      Object.keys(modelQuestions.shape),
    );
    expect(Object.keys(QUESTIONS_JSON_SCHEMA.properties.questions.items.properties)).toEqual(
      Object.keys(modelQuestions.shape.questions.element.shape),
    );
    expect(Object.keys(PLAN_JSON_SCHEMA.properties)).toEqual(Object.keys(modelPlan.shape));
    expect(Object.keys(PLAN_JSON_SCHEMA.properties.tasks.items.properties)).toEqual(
      Object.keys(modelPlan.shape.tasks.element.shape),
    );
    expect(Object.keys(PLAN_JSON_SCHEMA.properties.phases.items.properties)).toEqual(
      Object.keys(modelPlan.shape.phases.element.shape),
    );
    expect(Object.keys(PLAN_JSON_SCHEMA.properties.resources.items.properties)).toEqual(
      Object.keys(modelPlan.shape.resources.element.shape),
    );
    expect(Object.keys(MORE_JSON_SCHEMA.properties)).toEqual(Object.keys(modelMore.shape));
  });
});
