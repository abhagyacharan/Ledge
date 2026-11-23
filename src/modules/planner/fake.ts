import { addDaysIso, daysBetween } from "@/lib/dates";
import type {
  ModelMore,
  ModelPlan,
  ModelPlanTask,
  ModelQuestions,
  PlanBasics,
  PlanPhase,
} from "./schema";

/**
 * VOICE_FAKE=1: a deterministic stand-in for Groq so the planner can be tried and tested end to
 * end without a key or network. Together the replies exercise every path the pages have: all four
 * question kinds, a follow-up with a "because", three phases, a repeating task, milestones,
 * subtasks, estimates, resources, and one task whose date the resolver has to move (so a card
 * shows its "check" note). The real model handles every real goal.
 */

export function fakeQuestions(): ModelQuestions {
  return {
    questions: [
      {
        id: "q1",
        kind: "single",
        text: "Which area do you want to start with?",
        options: ["Landing pages", "Web apps", "Online shops", "Portfolios"],
        scaleLow: null,
        scaleHigh: null,
        because: null,
      },
      {
        id: "q2",
        kind: "multi",
        text: "Which of these have you done before?",
        options: ["Built a site", "Worked with a client", "Sent a pitch", "Set a price"],
        scaleLow: null,
        scaleHigh: null,
        because: null,
      },
      {
        id: "q3",
        kind: "scale",
        text: "How comfortable are you with the skills involved?",
        options: [],
        scaleLow: "Never tried",
        scaleHigh: "I do it for a living",
        because: null,
      },
      {
        id: "q4",
        kind: "text",
        text: "Anything you have already tried, or want to avoid?",
        options: [],
        scaleLow: null,
        scaleHigh: null,
        because: null,
      },
    ],
  };
}

export function fakeFollowups(): ModelQuestions {
  return {
    questions: [
      {
        id: "f1",
        kind: "single",
        text: "Have you ever pitched to a client?",
        options: ["Never", "Once or twice", "Often"],
        scaleLow: null,
        scaleHigh: null,
        because: "Because selling can be the hard part",
      },
    ],
  };
}

const capital = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** A short list name from the goal's first words. */
function nameFrom(goal: string): string {
  const words = goal
    .replace(/[^\p{L}\p{N}\s'-]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
  return capital(words.slice(0, 4).join(" ").toLowerCase()) || "My plan";
}

const task = (
  over: Partial<ModelPlanTask> & Pick<ModelPlanTask, "title" | "phaseId">,
): ModelPlanTask => ({
  notes: null,
  dueDate: null,
  priority: "none",
  repeat: "none",
  repeatUntil: null,
  estimateMinutes: null,
  milestone: false,
  subtasks: [],
  ...over,
});

export function fakePlan(goal: string, basics: PlanBasics, today: string, end: string): ModelPlan {
  const days = daysBetween(today, end) + 1;
  const at = (fraction: number) => addDaysIso(today, Math.floor((days - 1) * fraction));
  const minutes = basics.minutesPerDay === "weekends" ? 60 : basics.minutesPerDay;
  const third = (n: number) => Math.floor((days * n) / 3);
  const phases = [
    { id: "p1", name: "Get set up", startDate: today, endDate: addDaysIso(today, third(1) - 1) },
    {
      id: "p2",
      name: "Build momentum",
      startDate: addDaysIso(today, third(1)),
      endDate: addDaysIso(today, third(2) - 1),
    },
    { id: "p3", name: "Finish strong", startDate: addDaysIso(today, third(2)), endDate: end },
  ];
  return {
    title: nameFrom(goal),
    listName: nameFrom(goal),
    summary: "Set up first, practise every day, then finish with a small project.",
    phases,
    tasks: [
      task({
        title: "Write down what done looks like",
        phaseId: "p1",
        notes:
          "Describe the result in two sentences. A clear target makes every later choice easier.",
        dueDate: today,
        priority: "high",
        estimateMinutes: 15,
        subtasks: ["Write the result in one sentence", "List what you need", "Pick a finish date"],
      }),
      task({
        title: "Choose your first small project",
        phaseId: "p1",
        notes: "Pick something you can finish in one week. Small wins keep you going.",
        dueDate: at(0.1),
        priority: "medium",
        estimateMinutes: 30,
      }),
      task({
        title: `Practise for ${minutes} minutes`,
        phaseId: "p2",
        notes: "Do a little, even on busy days. Steady practice beats rare long sessions.",
        dueDate: today,
        priority: "medium",
        repeat: "daily",
        estimateMinutes: Math.min(240, Math.max(5, minutes)),
      }),
      task({
        title: "Start the first small project",
        phaseId: "p2",
        notes: "Begin with the simplest version. You can improve it later.",
        dueDate: at(0.4),
        estimateMinutes: 60,
        subtasks: ["Plan the steps", "Build a first version", "Ask one person to try it"],
      }),
      task({
        title: "Review what worked and what did not",
        phaseId: "p2",
        dueDate: at(0.5),
        estimateMinutes: 20,
      }),
      task({
        title: "Finish a first version",
        phaseId: "p2",
        notes: "A checkpoint: something real that you can show.",
        dueDate: at(0.6),
        priority: "high",
        estimateMinutes: 90,
        milestone: true,
      }),
      task({
        title: "Share the result with someone",
        phaseId: "p3",
        dueDate: at(0.8),
        estimateMinutes: 25,
      }),
      task({
        title: "Finish and publish the result",
        phaseId: "p3",
        notes: "The big checkpoint. Finished beats perfect.",
        dueDate: end,
        priority: "high",
        estimateMinutes: 120,
        milestone: true,
      }),
      // Past the plan's last day on purpose: the resolver moves it and the card says so.
      task({
        title: "Plan what comes next",
        phaseId: "p3",
        dueDate: addDaysIso(end, 3),
        estimateMinutes: 30,
      }),
    ],
    resources: [
      { name: "The Beginner's Handbook", kind: "book", why: "A gentle start with the basics." },
      {
        name: "Practical Foundations",
        kind: "course",
        why: "Short lessons you can finish in a week.",
      },
      { name: "Learn by Doing", kind: "video", why: "Short videos that show each step." },
      { name: "Starters Circle", kind: "community", why: "People to ask when you are stuck." },
    ],
  };
}

/** "Add more tasks": three follow-on tasks in the plan's last phase. */
export function fakeMore(today: string, phases: PlanPhase[]): ModelMore {
  const phaseId = phases[phases.length - 1]?.id ?? "p1";
  return {
    tasks: [
      task({
        title: "Do a second small project",
        phaseId,
        notes: "Repeat what worked, with one new twist. Repetition builds confidence.",
        dueDate: addDaysIso(today, 2),
        estimateMinutes: 45,
        subtasks: ["Pick a twist", "Build it", "Share it"],
      }),
      task({
        title: "Ask for feedback on your last piece of work",
        phaseId,
        dueDate: addDaysIso(today, 3),
        priority: "medium",
        estimateMinutes: 20,
      }),
      task({
        title: "Write down your next goal",
        phaseId,
        dueDate: addDaysIso(today, 5),
        estimateMinutes: 15,
      }),
    ],
  };
}
