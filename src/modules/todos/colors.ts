/** Colour choices for lists and tags. Each has a name so a colour is never the only signal. */
export const COLOR_CHOICES = [
  { name: "Red", value: "#ef4444" },
  { name: "Orange", value: "#f97316" },
  { name: "Amber", value: "#f59e0b" },
  { name: "Green", value: "#10b981" },
  { name: "Teal", value: "#06b6d4" },
  { name: "Blue", value: "#3b82f6" },
  { name: "Violet", value: "#8b5cf6" },
  { name: "Pink", value: "#ec4899" },
  { name: "Grey", value: "#64748b" },
] as const;

export function colorName(value: string | null): string {
  return COLOR_CHOICES.find((c) => c.value.toLowerCase() === value?.toLowerCase())?.name ?? "None";
}
