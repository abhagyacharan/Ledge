import type { ComponentProps, ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type FormFieldProps = Omit<ComponentProps<typeof Input>, "id"> & {
  id: string;
  label: string;
  error?: string;
  /** Shown at the end of the label row, such as "Forgot password?". */
  labelAside?: ReactNode;
};

/** Labelled input with an associated, announced error message. 44px tap target. */
export function FormField({
  id,
  label,
  error,
  labelAside,
  className,
  "aria-describedby": describedBy,
  ...props
}: FormFieldProps) {
  const errorId = `${id}-error`;
  const described = [error ? errorId : null, describedBy].filter(Boolean).join(" ");
  return (
    <div className="flex flex-col gap-2">
      {labelAside ? (
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor={id}>{label}</Label>
          {labelAside}
        </div>
      ) : (
        <Label htmlFor={id}>{label}</Label>
      )}
      <Input
        id={id}
        name={id}
        className={`h-11 ${className ?? ""}`}
        aria-invalid={error ? true : undefined}
        {...props}
        aria-describedby={described || undefined}
      />
      {error ? (
        <p id={errorId} className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
