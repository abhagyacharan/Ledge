/**
 * A tiny CSV writer (RFC 4180): fields with a comma, quote or line break are quoted, quotes are
 * doubled, and rows end with CRLF. Fields that a spreadsheet would run as a formula (starting
 * with =, +, - or @) get a leading apostrophe, so opening an export never runs anything.
 */
export function csvField(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return "";
  let text = String(value);
  if (typeof value === "string" && /^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(
  header: string[],
  rows: (string | number | boolean | null | undefined)[][],
): string {
  return [header, ...rows].map((row) => row.map(csvField).join(",")).join("\r\n") + "\r\n";
}
