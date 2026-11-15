import { describe, expect, it } from "vitest";
import { fakeReply } from "./fake";
import { VOICE_ACTION_VARIANTS, VOICE_JSON_SCHEMA } from "./json-schema";
import { buildUserMessage, buildWhisperPrompt, VOICE_SYSTEM_PROMPT } from "./prompt";
import {
  modelCreateList,
  modelCreateTask,
  modelLogEntry,
  modelMarkEmiPaid,
  modelReply,
  modelUnclear,
} from "./schema";

describe("the JSON schema sent to Groq", () => {
  const zodVariants = {
    create_list: modelCreateList,
    create_task: modelCreateTask,
    log_entry: modelLogEntry,
    mark_emi_paid: modelMarkEmiPaid,
    unclear: modelUnclear,
  };

  it("has the same fields as the Zod reply schema, all required and closed", () => {
    for (const [type, zod] of Object.entries(zodVariants)) {
      const json = VOICE_ACTION_VARIANTS[type as keyof typeof VOICE_ACTION_VARIANTS];
      expect(Object.keys(json.properties).sort()).toEqual(Object.keys(zod.shape).sort());
      expect([...json.required].sort()).toEqual(Object.keys(zod.shape).sort());
      expect(json.additionalProperties).toBe(false);
    }
    expect(VOICE_JSON_SCHEMA.required).toEqual(["actions"]);
    expect(VOICE_JSON_SCHEMA.additionalProperties).toBe(false);
  });
});

describe("prompt", () => {
  it("puts today's facts, the lists, EMIs and the words in the user message", () => {
    const message = buildUserMessage(
      {
        today: "2026-11-15",
        weekday: "Sunday",
        timeZone: "Asia/Kolkata",
        currency: "INR",
        lists: ["General", "Work"],
        emis: [
          {
            ref: "E1",
            title: "Bike loan",
            category: "Vehicle loan",
            amount: "7000",
            dueDate: "2026-11-10",
          },
        ],
      },
      "paid the bike loan",
    );
    expect(message).toContain('"today":"2026-11-15"');
    expect(message).toContain('"Work"');
    expect(message).toContain('"ref":"E1"');
    expect(message).toContain("Food & Groceries");
    expect(message).toContain('"""paid the bike loan"""');
  });

  it("keeps the system prompt fixed (no dates or names inside it)", () => {
    expect(VOICE_SYSTEM_PROMPT).not.toMatch(/\d{4}-\d{2}-\d{2}/);
  });

  it("builds a short, de-duplicated Whisper vocabulary", () => {
    const prompt = buildWhisperPrompt(["General", "Work", "work"], ["Swiggy dinner", "Petrol"]);
    expect(prompt.split(", ").filter((w) => w.toLowerCase() === "work")).toHaveLength(1);
    expect(prompt).toContain("Swiggy dinner");
    expect(prompt).toContain("UPI");
    const long = buildWhisperPrompt(
      Array.from({ length: 200 }, (_, i) => `List number ${i}`),
      [],
    );
    expect(long.length).toBeLessThanOrEqual(620);
  });
});

describe("fake mode replies", () => {
  const emis = [
    {
      ref: "E1",
      title: "Bike loan",
      category: "Vehicle loan",
      amount: "7000",
      dueDate: "2026-11-10",
    },
  ];
  const reply = (text: string) => modelReply.parse(fakeReply(text, "2026-11-15", emis));

  it("splits an expense and a task", () => {
    const { actions } = reply(
      "Spent 500 on petrol today and create a task to make blueberry cheesecake",
    );
    expect(actions.map((a) => a.type)).toEqual(["log_entry", "create_task"]);
    expect(actions[0]).toMatchObject({
      amount: "500",
      category: "Transportation",
      date: "2026-11-15",
    });
    expect(actions[1]).toMatchObject({ title: "Make blueberry cheesecake" });
  });

  it("marks an EMI paid", () => {
    const { actions } = reply("Had to pay the EMI of bike loan of 7,000 rupees today");
    expect(actions[0]).toMatchObject({ type: "mark_emi_paid", emi: "E1" });
  });

  it("creates a list with its tasks", () => {
    const { actions } = reply(
      "Create a list called photography, and in that add 2 tasks such as take 5 photos of sun and click 10 photos of the moon today",
    );
    expect(actions[0]).toMatchObject({ type: "create_list", name: "Photography" });
    expect(actions.slice(1).every((a) => a.type === "create_task" && a.listRef === "L1")).toBe(
      true,
    );
    expect(actions).toHaveLength(3);
  });

  it("reads UPI and a foreign currency word", () => {
    const { actions } = reply("spent $500 on red bull cans via upi");
    expect(actions[0]).toMatchObject({
      paymentMethod: "UPI",
      currencyWord: "dollars",
      category: "Food & Groceries",
    });
  });

  it("marks anything else unclear", () => {
    expect(reply("hello there").actions[0].type).toBe("unclear");
  });
});
