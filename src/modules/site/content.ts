/**
 * Copy and links for the public site (src/app/(site)/welcome). Kept in one place so wording can change
 * without touching the layout. Every product fact here must stay true to the app (docs/site designs/).
 */

export const SITE_LINKS = {
  signIn: "/sign-in",
  github: "https://github.com/abhagyacharan/Ledge",
  portfolio: "https://abhagyacharan.xyz",
  builtBy: "Bhagya Charan Aela",
} as const;

export const NAV_ITEMS = [
  { href: "#how", label: "How it works" },
  { href: "#voice", label: "Voice" },
  { href: "#faq", label: "FAQ" },
] as const;

export const FAQS: readonly { q: string; a: string }[] = [
  {
    q: "Who is Ledge for?",
    a: "Anyone who wants their tasks, spending and journal in one private place, and opens it many times a day. It is built for one person, not a team.",
  },
  {
    q: "Who can see my data?",
    a: "Only you. Ledge is private by design: your tasks, money and journal live in your account and nobody else can open them.",
  },
  {
    q: "Does voice capture listen all the time?",
    a: "No. It only listens after you hold the + button for half a second, and stops when you press Done. The audio is never stored, and nothing is saved until you check the cards and tap Add.",
  },
  {
    q: "What if I delete something by mistake?",
    a: "Every delete shows Undo for 6 seconds. After that, the item waits in Trash for 30 days, where you can restore it.",
  },
  {
    q: "Can I get my data out?",
    a: "Yes, all of it. Export everything as JSON, your tasks as CSV, and your money summaries as PDF reports.",
  },
  {
    q: "Does it handle rupees properly?",
    a: "Yes. Amounts use lakh grouping (₹1,23,456), dates read Fri, 13 Nov, and weeks start on Monday. You can change all three.",
  },
  {
    q: "Can I lock my journal?",
    a: "Yes. Set an optional PIN and the journal asks for it before it opens.",
  },
];

export type VoiceCardType = "expense" | "emi" | "list" | "task";

export type VoiceExample = {
  said: string;
  addLabel: string;
  toast: string;
  cards: {
    kind: string;
    title: string;
    type: VoiceCardType;
    /** Fields; `guessed` marks the ones Ledge filled in by itself. */
    fields: { value: string; guessed?: boolean }[];
  }[];
};

export const VOICE_EXAMPLES: readonly VoiceExample[] = [
  {
    said: "Spent 500 on petrol today and paid the bike loan EMI",
    addLabel: "Add 2",
    toast: "Added 1 expense and marked 1 EMI paid",
    cards: [
      {
        kind: "Expense",
        title: "Petrol",
        type: "expense",
        fields: [
          { value: "₹500" },
          { value: "Transportation", guessed: true },
          { value: "UPI", guessed: true },
          { value: "Today" },
        ],
      },
      {
        kind: "EMI paid",
        title: "Bike loan",
        type: "emi",
        fields: [{ value: "₹7,000", guessed: true }, { value: "Mark paid today" }],
      },
    ],
  },
  {
    said: "Paid the bike loan EMI of 7,000 today.",
    addLabel: "Add 1",
    toast: "Marked 1 EMI paid",
    cards: [
      {
        kind: "EMI paid",
        title: "Bike loan",
        type: "emi",
        fields: [{ value: "₹7,000" }, { value: "Mark paid today" }],
      },
    ],
  },
  {
    said: "Create a list called Photography and add two tasks: take 5 photos of the sun, and click 10 photos of the moon today.",
    addLabel: "Add 3",
    toast: "Added 1 list and 2 tasks",
    cards: [
      { kind: "New list", title: "Photography", type: "list", fields: [{ value: "2 tasks" }] },
      {
        kind: "New task",
        title: "Take 5 photos of the sun",
        type: "task",
        fields: [{ value: "Photography" }, { value: "No date", guessed: true }],
      },
      {
        kind: "New task",
        title: "Click 10 photos of the moon",
        type: "task",
        fields: [{ value: "Photography" }, { value: "Today" }],
      },
    ],
  },
];

/** The demo's pretend "today" (Fri, 13 Nov 2026) and lists, fed to the real quick-add parser. */
export const DEMO_TODAY = "2026-11-13";
export const DEMO_LISTS = [
  { id: "general", name: "General" },
  { id: "home", name: "Home" },
  { id: "freelance", name: "Freelance" },
  { id: "health", name: "Health" },
  { id: "open-source", name: "Open source" },
];
export const TYPE_EXAMPLES = [
  "call mom sunday 7pm",
  "renew bike insurance monday #home p2",
  "send invoice friday #freelance p1",
];
