import {
  describeBasics,
  MAX_FOLLOWUPS,
  MAX_MILESTONES,
  MAX_MORE_TASKS,
  MAX_NOTES,
  MAX_OPTIONS,
  MAX_PHASES,
  MAX_QUESTIONS,
  MAX_RESOURCES,
  MAX_SUBTASKS,
  MAX_TASKS,
  MAX_TASKS_PER_PHASE,
  MIN_QUESTIONS,
  MIN_RESOURCES,
  PLAN_WINDOW_DAYS,
  type PlanAnswer,
  type PlanBasics,
  type PlanPhase,
} from "./schema";

/**
 * What the language model is told (docs/plans-module-spec.md §3, §7). Pure, so it can be tested and
 * so the fixed system prompts stay byte-identical between requests (no per-request data in them).
 * Only the goal, the basics, the answers, today's date and the names of the user's lists are ever
 * sent; for "Add more tasks", also that one plan's task titles and whether each is done. Never
 * other tasks, money or journal text.
 */

export type PlannerContext = {
  today: string;
  weekday: string;
  timeZone: string;
  /** The user's list names, except General. */
  lists: string[];
};

const QUESTION_KINDS_HELP = `Kinds of question:
- single: pick one ("What kind of websites?"), 2 to ${MAX_OPTIONS} short options.
- multi: pick several ("Which of these have you done before?"), 2 to ${MAX_OPTIONS} short options.
- scale: 1 to 5 ("How good are you at web design?"); give scaleLow (what 1 means) and scaleHigh (what 5 means) in a few words each.
- text: a short typed answer ("Anything you have already tried, or want to avoid?").
Use single only when the answers rule each other out ("Which do you want to sell first?"); when more than one could be true, use multi.
For single and multi, options holds the answers; for scale and text, options is empty. Do not include "Other", "Not sure" or "Skip": the page adds "Type my own" and "Skip" itself.`;

export const QUESTIONS_SYSTEM_PROMPT = `You help a person plan a goal in Ledge, their personal task list. Before the plan is made you ask a few quick questions about the goal.

The app has already asked the plan length and the time they can give each day (they are in the message). Never ask about either.

Ask ${MIN_QUESTIONS} to ${MAX_QUESTIONS} questions that would change the plan and that the goal does not already answer: which kind or area they mean, their current level, what they have already done, what has been hard, what to avoid. Use the kinds well: a scale for skill level, multi for "which of these have you done", single for the kind or area, text for "anything to avoid". Never ask what the goal already tells you.

${QUESTION_KINDS_HELP}

- ids are q1, q2, q3 and so on. because is null.
- Plain words, sentence case, no emoji.`;

export const FOLLOWUPS_SYSTEM_PROMPT = `You help a person plan a goal in Ledge, their personal task list. They have answered a first round of questions. Now decide whether one more round is needed.

Ask 0 to ${MAX_FOLLOWUPS} follow-up questions, only when an answer opens something important that the plan depends on (for example: they said sales feels hard, so ask whether they have ever pitched to a client). Often the right number is zero: return an empty list when the answers are enough. Never repeat a question already asked. Never ask about the plan length or time per day.

${QUESTION_KINDS_HELP}

- ids are f1, f2, f3.
- because: a few words (under 60 characters) saying which answer this follows from, such as "Because you said sales feels hard".
- Plain words, sentence case, no emoji.`;

const TASK_RULES = `Each task:
- title: concrete and doable in one sitting ("Write a one-line offer for your first client"), never vague ("Get better", "Study system design topics"). Name the actual topic or thing to do ("Learn how a load balancer spreads traffic"). Start with a verb, first letter capital, under 100 characters.
- You are the planner, so never hand the planning back: no tasks like "Make a checklist", "Create a study plan", "Plan your next roadmap", "Set goals", "Make a schedule", "Research resources" or "Find a course". The plan itself is the roadmap, including its last week. If a checklist or list of topics would help, write it yourself, as that task's subtasks or in its notes.
- notes: how to do it, then why it matters for the goal, in at most ${MAX_NOTES} characters; or null.
- phaseId: the id of the phase it belongs to.
- dueDate: YYYY-MM-DD from today to the plan's last day, spread across the time they have; null only when a task has no natural date.
- priority: none, low, medium or high. High only for the few that matter most: never more than one task in four, milestones included. Most tasks are medium or low.
- estimateMinutes: whole minutes from 5 to 240, fitted to the time they can give each day (a task for a 30-minutes-a-day person should not take 3 hours); or null.
- milestone: true for a real checkpoint, such as "Send 10 pitches". Milestones are high priority.
- subtasks: up to ${MAX_SUBTASKS} short steps when the task has steps ("Pick 3 projects", "Write case studies", "Deploy"); otherwise an empty list. A repeating task has none.
- Practice they will do again and again (every day, on weekdays, every week) is ONE repeating task, never many copies: repeat is daily, weekdays or weekly, dueDate is its first day and repeatUntil its last day (or null to end with the plan). One-off tasks have repeat none and repeatUntil null.`;

export const PLAN_SYSTEM_PROMPT = `You turn a person's goal into a plan for Ledge, their personal task list: phases, concrete tasks with dates, and a few things to read or watch.

First put the advice the goal itself mentions. If they say freelancing is more about sales than skills, the early work is the sales side: the offer, pricing, outreach and follow-ups, not only skills. Use their answers; where they gave none, choose sensible defaults. Start where their level is: a complete beginner begins with the foundations. Fit the work to the time they can give each day and to the plan's length.

Cover the whole goal, not just its first step. When a goal has a starting point and a bigger aim ("start with the basics of cooking, then host a dinner for friends"), the early phases cover the starting point and the later phases build towards the bigger aim, with at least one phase of its own for it. Every part of the goal and every wish in their answers shows up in at least one phase; the summary says how.

- title: a short name for the plan, under 60 characters, no emoji.
- listName: a short name for the plan's own list ("Start freelancing"), under 40 characters.
- summary: one short sentence on how the plan is shaped ("Four weeks: offer and portfolio first, then outreach every weekday").
- phases: 2 to ${MAX_PHASES}, in order, each with an id (p1, p2, ...), a short name ("Your offer") and startDate and endDate (YYYY-MM-DD). They run one after another with no gaps, the first starting today and the last ending on the plan's last day.
- tasks: at most ${MAX_TASKS} in all and at most ${MAX_TASKS_PER_PHASE} per phase, in the order to do them, with 1 to ${MAX_MILESTONES} milestones in all. Fill the time they have: about 6 to 10 tasks for a week or two, 15 to 20 for a month, 25 to 30 for three months or more. Leave no week without a task.
- resources: ${MIN_RESOURCES} to ${MAX_RESOURCES} books, courses, video channels, communities, tools or articles that would help. Give the name, the kind (book, course, video, community, tool or article) and one line on why. NEVER give a web address or link: names only.

${TASK_RULES}

Work dates out from today in the context. Plain words, no emoji.`;

export const MORE_SYSTEM_PROMPT = `You add the next steps to a plan the person already has in Ledge, their personal task list. You are given the plan's goal, its phases and its task titles with whether each is done.

Suggest up to ${MAX_MORE_TASKS} new tasks that continue from today and build on what is done: the next logical steps, not repeats of existing tasks. Put each in one of the existing phases (use its id). Fit them to the time they can give each day.

${TASK_RULES}

Work dates out from today in the context. Plain words, no emoji.`;

function contextJson(c: PlannerContext): string {
  return JSON.stringify({
    today: c.today,
    weekday: c.weekday,
    timeZone: c.timeZone,
    existingLists: c.lists,
  });
}

function basicsLines(basics: PlanBasics, end: string | null): string {
  const d = describeBasics(basics);
  return `Plan length: ${d.length}${end ? ` (last day ${end})` : ""}\nTime they can give: ${d.time}`;
}

/** One answer as a line for the prompt: ticked options, scale value, typed text, or skipped. */
export function describeAnswer(a: PlanAnswer): string {
  const parts: string[] = [];
  if (Array.isArray(a.value)) parts.push(a.value.join(", "));
  else if (typeof a.value === "number") parts.push(`${a.value} of 5`);
  else if (typeof a.value === "string" && a.value.trim()) parts.push(a.value.trim());
  if (a.custom?.trim()) parts.push(`(own words: ${a.custom.trim()})`);
  return parts.length > 0 ? parts.join(" ") : "(skipped)";
}

function answersBlock(answers: PlanAnswer[]): string {
  return answers.length === 0
    ? "(none)"
    : answers.map((a) => `Q: ${a.question}\nA: ${describeAnswer(a)}`).join("\n");
}

/** The user message for the questions step. Compact JSON: tokens count against the free plan. */
export function buildQuestionsMessage(
  c: PlannerContext,
  goal: string,
  basics: PlanBasics,
  end: string | null,
): string {
  return `Context:\n${contextJson(c)}\n\nTheir goal:\n"""${goal}"""\n\nAlready asked by the app:\n${basicsLines(basics, end)}`;
}

export function buildFollowupsMessage(
  c: PlannerContext,
  goal: string,
  basics: PlanBasics,
  end: string | null,
  answers: PlanAnswer[],
): string {
  return `${buildQuestionsMessage(c, goal, basics, end)}\n\nTheir answers so far:\n${answersBlock(answers)}`;
}

/** The user message for the plan step: the goal, the basics and every answer from both rounds. */
export function buildPlanMessage(
  c: PlannerContext,
  goal: string,
  basics: PlanBasics,
  end: string,
  answers: PlanAnswer[],
): string {
  return `Context:\n${contextJson(c)}\n\nTheir goal:\n"""${goal}"""\n\nPlan:\n${basicsLines(basics, end)}\nThe plan may not reach further than ${PLAN_WINDOW_DAYS} days from today.\n\nTheir answers:\n${answersBlock(answers)}`;
}

export type MorePlan = {
  goal: string;
  basics: PlanBasics | null;
  endDate: string | null;
  phases: PlanPhase[];
  tasks: { title: string; done: boolean; phaseId: string | null }[];
};

/** For "Add more tasks": this plan's own task titles and done state, and nothing else. */
export function buildMoreMessage(c: PlannerContext, plan: MorePlan): string {
  const phases = plan.phases.map((p) => ({
    id: p.id,
    name: p.name,
    from: p.startDate,
    to: p.endDate,
  }));
  const tasks = plan.tasks.map((t) => ({ title: t.title, done: t.done, phase: t.phaseId }));
  const time = plan.basics ? describeBasics(plan.basics).time : "not said";
  return `Context:\n${JSON.stringify({ today: c.today, weekday: c.weekday, timeZone: c.timeZone })}\n\nTheir goal:\n"""${plan.goal}"""\n\nTime they can give: ${time}\nPlan's last day: ${plan.endDate ?? "not set"}\nPhases:\n${JSON.stringify(phases)}\nTasks so far:\n${JSON.stringify(tasks)}`;
}
