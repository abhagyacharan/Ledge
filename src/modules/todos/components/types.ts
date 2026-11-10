import type { Tag } from "@/server/db/schema";

/** Date context computed on the server in the user's timezone and passed to the client. */
export type DateContext = {
  today: string;
  timeNow: string;
  locale: string;
  weekStartsOn: number;
};

export type TagsById = Record<string, Tag>;

export const PRIORITY_LABELS = ["None", "Low", "Medium", "High"] as const;
