"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner, type ToasterProps } from "sonner";
import {
  CircleCheckIcon,
  InfoIcon,
  TriangleAlertIcon,
  OctagonXIcon,
  Loader2Icon,
} from "lucide-react";

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      // The undo toast (docs/new_design.md §4): an ink pill at the bottom centre, above the
      // phone tab bar, with its action in bold. Errors keep their icon so they never rest on colour.
      position="bottom-center"
      offset={{ bottom: 24 }}
      mobileOffset={{ bottom: "calc(var(--tabbar-gap) + 5rem)", left: 16, right: 16 }}
      style={
        {
          "--normal-bg": "var(--dash-ink)",
          "--normal-text": "var(--dash-card)",
          "--normal-border": "transparent",
          "--border-radius": "999px",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast:
            "cn-toast !items-center !gap-2.5 !py-3 !pr-3 !pl-4 !text-[13px] !font-medium !shadow-[0_16px_40px_-16px_rgb(0_0_0/0.45)]",
          actionButton:
            "!h-8 !rounded-full !bg-transparent !px-3 !text-[13px] !font-semibold !text-dash-accent-on-ink hover:!bg-white/10 dark:hover:!bg-black/5",
          title: "!font-medium",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
