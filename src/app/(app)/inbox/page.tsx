import { redirect } from "next/navigation";

/** Inbox was replaced by the Tasks overview (its list is now called General). Old links still work. */
export default function InboxPage() {
  redirect("/tasks");
}
