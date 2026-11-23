"use client";

import { Check, ChevronDown } from "lucide-react";
import { Select as SelectPrimitive } from "radix-ui";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type SelectOption = { value: string; label: string };

/**
 * The planner's dropdown: a pill (or a full-width field) that opens a menu in the dashboard look,
 * instead of the operating system's own select list. Radix gives it keyboard use and screen
 * reader support. Values must not be empty strings (Radix reserves those).
 */
export function PlanSelect({
  label,
  icon,
  value,
  options,
  onChange,
  variant = "pill",
  className,
}: {
  label: string;
  icon?: ReactNode;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  variant?: "pill" | "field";
  className?: string;
}) {
  return (
    <SelectPrimitive.Root value={value} onValueChange={onChange}>
      <SelectPrimitive.Trigger
        aria-label={label}
        className={cn(
          "inline-flex min-w-0 items-center gap-1.5 text-dash-ink outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 data-[state=open]:bg-dash-edge",
          variant === "pill"
            ? "h-11 rounded-full bg-dash-well px-3.5 text-[13px] font-medium hover:bg-dash-edge md:h-9"
            : "h-11 w-full justify-between rounded-xl bg-dash-well px-3 text-sm hover:bg-dash-edge",
          className,
        )}
      >
        {icon}
        <span className="truncate">
          <SelectPrimitive.Value />
        </span>
        <SelectPrimitive.Icon asChild>
          <ChevronDown aria-hidden className="size-3.5 shrink-0 text-dash-ink-soft" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={6}
          align="start"
          className="dash z-50 max-h-[min(var(--radix-select-content-available-height),20rem)] min-w-[max(var(--radix-select-trigger-width),11rem)] overflow-hidden rounded-2xl border border-dash-edge bg-dash-card p-1 text-dash-ink shadow-[0_12px_32px_-8px_rgb(0_0_0/0.22)] data-[state=open]:motion-safe:animate-in data-[state=open]:motion-safe:fade-in-0 data-[state=open]:motion-safe:zoom-in-95 data-[state=open]:motion-safe:duration-150"
        >
          <SelectPrimitive.Viewport className="max-h-[inherit] overflow-y-auto">
            {options.map((option) => (
              <SelectPrimitive.Item
                key={option.value}
                value={option.value}
                className="relative flex min-h-11 cursor-pointer items-center rounded-xl py-2 pr-9 pl-3 text-sm outline-none select-none data-highlighted:bg-dash-well data-[state=checked]:font-semibold md:min-h-9"
              >
                <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
                <SelectPrimitive.ItemIndicator className="absolute right-3 grid place-items-center">
                  <Check aria-hidden className="size-4 text-dash-accent" />
                </SelectPrimitive.ItemIndicator>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}
