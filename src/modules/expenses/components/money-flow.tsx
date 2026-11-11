"use client";

import NumberFlow from "@number-flow/react";
import { minorDigits } from "@/lib/money";

type Fmt = { currency: string; locale: string };

/** A money figure whose digits roll to the new value when the period or filter changes. */
export function MoneyFlow({ minor, fmt }: { minor: number; fmt: Fmt }) {
  const digits = minorDigits(fmt.currency);
  return (
    <NumberFlow
      value={minor / 10 ** digits}
      locales={fmt.locale}
      format={{
        style: "currency",
        currency: fmt.currency,
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      }}
      transformTiming={{ duration: 450, easing: "cubic-bezier(0.23, 1, 0.32, 1)" }}
      spinTiming={{ duration: 450, easing: "cubic-bezier(0.23, 1, 0.32, 1)" }}
      opacityTiming={{ duration: 250, easing: "ease-out" }}
    />
  );
}
