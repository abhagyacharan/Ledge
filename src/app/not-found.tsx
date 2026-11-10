import Link from "next/link";
import { EmptyState } from "@/components/shell/empty-state";
import { Button } from "@/components/ui/button";

/** Any address that does not exist. Themed, so it is not a white page in dark mode. */
export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-svh max-w-md flex-col justify-center px-4">
      <EmptyState
        title="We couldn't find that page"
        hint="The link may be wrong, or the page may have moved."
        action={
          <Button asChild className="h-11">
            <Link href="/inbox">Go to your Inbox</Link>
          </Button>
        }
      />
    </main>
  );
}
