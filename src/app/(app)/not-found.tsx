import Link from "next/link";
import { EmptyState } from "@/components/shell/empty-state";
import { Button } from "@/components/ui/button";

/** A list or tag that does not exist (or belongs to someone else) lands here. */
export default function NotFound() {
  return (
    <EmptyState
      title="We couldn't find that"
      hint="It may have been deleted, or the link may be wrong."
      action={
        <Button asChild className="h-11 md:h-8">
          <Link href="/inbox">Go to your Inbox</Link>
        </Button>
      }
    />
  );
}
