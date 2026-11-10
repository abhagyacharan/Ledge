"use client";

import { useEffect } from "react";
import "./globals.css";

/**
 * Last-resort error screen, used when the app frame itself fails to render. It replaces the whole
 * page, so it brings its own <html> and uses plain elements.
 */
export default function GlobalError({
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
    <html lang="en">
      <body className="flex min-h-svh items-center justify-center bg-background px-4 text-foreground">
        <div className="max-w-md rounded-xl border border-dashed p-10 text-center">
          <h1 className="font-medium">Something went wrong</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Ledge couldn&apos;t load. Your tasks are safe. Try again in a moment.
          </p>
          <button
            type="button"
            onClick={reset}
            className="mt-4 h-11 rounded-lg bg-primary px-4 text-primary-foreground"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
