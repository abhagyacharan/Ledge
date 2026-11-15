/**
 * Small text helpers for showing search results (docs/new_design.md screen 5a): which parts of a
 * text match the search words, and a short piece of a long note around the first match. Pure.
 */

/** The search words, as the server reads them: letters and digits, at most ten. */
export function searchWords(query: string): string[] {
  return (query.match(/[\p{L}\p{N}]+/gu) ?? []).slice(0, 10);
}

export type Part = { text: string; match: boolean };

/**
 * Splits `text` into matching and plain parts. A word matches where a word in the text starts with
 * it ("gro" marks "groceries"), ignoring case.
 */
export function highlightParts(text: string, words: string[]): Part[] {
  if (words.length === 0 || !text) return [{ text, match: false }];
  const escaped = words
    .filter(Boolean)
    .sort((a, b) => b.length - a.length)
    .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const pattern = new RegExp(`(?<![\\p{L}\\p{N}])(${escaped.join("|")})`, "giu");
  const parts: Part[] = [];
  let last = 0;
  for (const found of text.matchAll(pattern)) {
    const start = found.index ?? 0;
    if (start > last) parts.push({ text: text.slice(last, start), match: false });
    parts.push({ text: found[0], match: true });
    last = start + found[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last), match: false });
  return parts.length > 0 ? parts : [{ text, match: false }];
}

/** Whether any of the words matches somewhere in `text`. */
export function matches(text: string | null | undefined, words: string[]): boolean {
  return Boolean(text) && highlightParts(text ?? "", words).some((p) => p.match);
}

/**
 * A piece of `text` around its first match, with "…" where it was cut: "…match every invoice
 * number…". Null when nothing matches.
 */
export function snippet(text: string, words: string[], around = 24): string | null {
  const parts = highlightParts(text.replace(/\s+/g, " ").trim(), words);
  const flat = parts.map((p) => p.text).join("");
  let offset = 0;
  for (const p of parts) {
    if (p.match) {
      const start = Math.max(0, offset - around);
      const end = Math.min(flat.length, offset + p.text.length + around);
      return `${start > 0 ? "…" : ""}${flat.slice(start, end).trim()}${end < flat.length ? "…" : ""}`;
    }
    offset += p.text.length;
  }
  return null;
}
