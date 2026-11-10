"use client";

import { useEffect } from "react";
import { EmptyState } from "@/components/shell/empty-state";
import { Button } from "@/components/ui/button";

/** Friendly error screen for any view that fails to load. */
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <EmptyState
      title="Something went wrong"
      hint="This page couldn't load. Your tasks are safe. Try again in a moment."
      action={
        <Button type="button" className="h-11 md:h-8" onClick={reset}>
          Try again
        </Button>
      }
    />
  );
}
