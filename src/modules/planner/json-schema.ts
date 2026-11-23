import {
  MAX_FOLLOWUPS,
  MAX_MORE_TASKS,
  MAX_OPTIONS,
  MAX_PHASES,
  MAX_QUESTIONS,
  MAX_RESOURCES,
  MAX_SUBTASKS,
  MAX_TASKS,
  PRIORITY_WORDS,
  QUESTION_KINDS,
  REPEATS,
  RESOURCE_KINDS,
} from "./schema";

/**
 * The JSON schemas sent to Groq with `response_format: { type: "json_schema", strict: true }`
 * (docs/plans-module-spec.md). Strict mode needs every property in `required`, `additionalProperties:
 * false` on every object and `null` unions for "not said". They mirror `modelQuestions`,
 * `modelPlan` and `modelMore` in schema.ts.
 */

const str = { type: "string" } as const;
const strOrNull = { type: ["string", "null"] } as const;

function questionsSchema(max: number, note: string) {
  return {
    type: "object",
    properties: {
      questions: {
        type: "array",
        description: `${note} At most ${max}.`,
        items: {
          type: "object",
          properties: {
            id: str,
            kind: { type: "string", enum: [...QUESTION_KINDS] },
            text: str,
            options: {
              type: "array",
              description: `For single and multi: 2 to ${MAX_OPTIONS} short answers. Otherwise empty.`,
              items: str,
            },
            scaleLow: { ...strOrNull, description: "For scale: what 1 means. Otherwise null." },
            scaleHigh: { ...strOrNull, description: "For scale: what 5 means. Otherwise null." },
            because: {
              ...strOrNull,
              description: "For a follow-up: a few words on why it is asked. Otherwise null.",
            },
          },
          required: ["id", "kind", "text", "options", "scaleLow", "scaleHigh", "because"],
          additionalProperties: false,
        },
      },
    },
    required: ["questions"],
    additionalProperties: false,
  } as const;
}

export const QUESTIONS_JSON_SCHEMA = questionsSchema(
  MAX_QUESTIONS,
  "Questions tailored to the goal.",
);
export const FOLLOWUPS_JSON_SCHEMA = questionsSchema(
  MAX_FOLLOWUPS,
  "Follow-up questions; an empty list when nothing needs asking.",
);

const taskSchema = {
  type: "object",
  properties: {
    title: str,
    notes: strOrNull,
    phaseId: str,
    dueDate: strOrNull,
    priority: { type: "string", enum: [...PRIORITY_WORDS] },
    repeat: { type: "string", enum: [...REPEATS] },
    repeatUntil: strOrNull,
    estimateMinutes: { type: ["integer", "null"] },
    milestone: { type: "boolean" },
    subtasks: {
      type: "array",
      description: `At most ${MAX_SUBTASKS} steps, only where the task has steps.`,
      items: str,
    },
  },
  required: [
    "title",
    "notes",
    "phaseId",
    "dueDate",
    "priority",
    "repeat",
    "repeatUntil",
    "estimateMinutes",
    "milestone",
    "subtasks",
  ],
  additionalProperties: false,
} as const;

export const PLAN_JSON_SCHEMA = {
  type: "object",
  properties: {
    title: str,
    listName: str,
    summary: str,
    phases: {
      type: "array",
      description: `2 to ${MAX_PHASES} phases in order.`,
      items: {
        type: "object",
        properties: { id: str, name: str, startDate: str, endDate: str },
        required: ["id", "name", "startDate", "endDate"],
        additionalProperties: false,
      },
    },
    tasks: {
      type: "array",
      description: `At most ${MAX_TASKS} tasks in all.`,
      items: taskSchema,
    },
    resources: {
      type: "array",
      description: `3 to ${MAX_RESOURCES} resources, by name only.`,
      items: {
        type: "object",
        properties: { name: str, kind: { type: "string", enum: [...RESOURCE_KINDS] }, why: str },
        required: ["name", "kind", "why"],
        additionalProperties: false,
      },
    },
  },
  required: ["title", "listName", "summary", "phases", "tasks", "resources"],
  additionalProperties: false,
} as const;

export const MORE_JSON_SCHEMA = {
  type: "object",
  properties: {
    tasks: {
      type: "array",
      description: `At most ${MAX_MORE_TASKS} tasks.`,
      items: taskSchema,
    },
  },
  required: ["tasks"],
  additionalProperties: false,
} as const;
