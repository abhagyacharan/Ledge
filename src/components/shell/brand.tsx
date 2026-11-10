import { APP_NAME } from "@/config/app";
import { cn } from "@/lib/utils";

/**
 * The mark is an "L" standing on a double rule: the line an accountant draws under a final total.
 * It says what the app is for (the bottom line of your tasks and your money) without a picture.
 */
export function LedgeMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.75"
      strokeLinecap="square"
      aria-hidden
      className={cn("size-6 shrink-0", className)}
    >
      <path d="M10 5v16.5M10 21.5h15M10 27h15" />
    </svg>
  );
}

export function Brand({ className, size = "md" }: { className?: string; size?: "md" | "lg" }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LedgeMark className={size === "lg" ? "size-9" : "size-6"} />
      <span
        className={cn(
          "font-display font-semibold tracking-tight",
          size === "lg" ? "text-3xl" : "text-xl",
        )}
      >
        {APP_NAME}
      </span>
    </span>
  );
}
