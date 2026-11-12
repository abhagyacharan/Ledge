/**
 * A very small PDF writer for Ledge's printable reports (expense breakdown, annual cash flow).
 * It draws text in the two standard Helvetica faces, filled rectangles and lines on A4 pages,
 * which is all a ledger-style table needs. No dependency: the standard 14 fonts are built into
 * every PDF reader, so nothing is embedded (decided 2026-11-12, see docs/decisions.md).
 *
 * Coordinates are in points (1/72 inch) from the TOP-LEFT corner of the page, like the screen;
 * the writer flips them to PDF's bottom-left origin. Text is limited to what the standard fonts'
 * WinAnsi encoding can show: anything else is replaced (`toWinAnsi`).
 */

export const A4 = { width: 595.28, height: 841.89 } as const;

export type PdfFont = "regular" | "bold";
/** A colour as three 0 to 1 channels. */
export type Rgb = readonly [number, number, number];

export const INK: Rgb = [0.067, 0.071, 0.078];

/**
 * Advance widths (per 1000 units of font size) of the printable ASCII range 32 to 126, from
 * Adobe's Helvetica and Helvetica-Bold font metrics.
 */
const WIDTHS: Record<PdfFont, readonly number[]> = {
  regular: [
    278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556,
    556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556, 1015, 667, 667, 722, 722, 667,
    611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667,
    667, 611, 278, 278, 278, 469, 556, 333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500,
    222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584,
  ],
  bold: [
    278, 333, 474, 556, 556, 889, 722, 238, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556,
    556, 556, 556, 556, 556, 556, 556, 333, 333, 584, 584, 584, 611, 975, 722, 722, 722, 722, 667,
    611, 778, 722, 278, 556, 722, 611, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667,
    667, 611, 333, 278, 333, 584, 556, 333, 556, 611, 556, 611, 556, 333, 611, 611, 278, 278, 556,
    278, 889, 611, 611, 611, 611, 389, 556, 333, 611, 556, 778, 556, 556, 500, 389, 280, 389, 584,
  ],
};

/** Common typographic characters, spelled in plain ASCII. */
const REPLACEMENTS: Record<string, string> = {
  " ": " ", // no-break space (Intl uses it)
  " ": " ", // narrow no-break space
  "–": "-",
  "—": "-",
  "−": "-", // minus sign
  "‘": "'",
  "’": "'",
  "“": '"',
  "”": '"',
  "…": "...",
  "·": "-",
  "₹": "Rs ",
};

/** Text the standard fonts can draw: printable ASCII only; anything else becomes "?". */
export function toWinAnsi(text: string): string {
  let out = "";
  for (const ch of text) {
    const replaced = REPLACEMENTS[ch] ?? ch;
    for (const c of replaced) {
      const code = c.charCodeAt(0);
      out += code >= 32 && code <= 126 ? c : "?";
    }
  }
  return out;
}

/** Width of `text` in points at `size`. */
export function textWidth(text: string, size: number, font: PdfFont = "regular"): number {
  const widths = WIDTHS[font];
  let units = 0;
  for (const c of toWinAnsi(text)) units += widths[c.charCodeAt(0) - 32] ?? 556;
  return (units * size) / 1000;
}

/** Shortens `text` with "..." so it fits `max` points. */
export function fitText(text: string, max: number, size: number, font: PdfFont = "regular") {
  const clean = toWinAnsi(text);
  if (textWidth(clean, size, font) <= max) return clean;
  let cut = clean;
  while (cut.length > 0 && textWidth(`${cut}...`, size, font) > max) cut = cut.slice(0, -1);
  return `${cut}...`;
}

const n = (value: number) => (Math.round(value * 100) / 100).toString();
const rgb = ([r, g, b]: Rgb) => `${n(r)} ${n(g)} ${n(b)}`;
const escape = (text: string) => text.replace(/[\\()]/g, (c) => `\\${c}`);

export type TextOptions = {
  size?: number;
  font?: PdfFont;
  color?: Rgb;
  /** "right" puts the END of the text at `x`; "center" centres it on `x`. */
  align?: "left" | "right" | "center";
};

/** One page's drawing commands. */
export class PdfPage {
  readonly ops: string[] = [];

  constructor(readonly height: number) {}

  /** `y` is the text's baseline, measured from the top of the page. */
  text(x: number, y: number, text: string, options: TextOptions = {}) {
    const { size = 10, font = "regular", color = INK, align = "left" } = options;
    const clean = toWinAnsi(text);
    const width = textWidth(clean, size, font);
    const left = align === "right" ? x - width : align === "center" ? x - width / 2 : x;
    const face = font === "bold" ? "F2" : "F1";
    this.ops.push(
      `${rgb(color)} rg BT /${face} ${n(size)} Tf ${n(left)} ${n(this.height - y)} Td (${escape(clean)}) Tj ET`,
    );
  }

  /** A filled rectangle; `y` is its top edge. */
  rect(x: number, y: number, width: number, height: number, color: Rgb) {
    this.ops.push(
      `${rgb(color)} rg ${n(x)} ${n(this.height - y - height)} ${n(width)} ${n(height)} re f`,
    );
  }

  line(x1: number, y1: number, x2: number, y2: number, color: Rgb = INK, width = 0.5) {
    this.ops.push(
      `${rgb(color)} RG ${n(width)} w ${n(x1)} ${n(this.height - y1)} m ${n(x2)} ${n(this.height - y2)} l S`,
    );
  }
}

/** A document of A4 pages. `toBytes()` writes the finished file. */
export class PdfDocument {
  readonly pages: PdfPage[] = [];

  constructor(private readonly title: string) {}

  addPage(): PdfPage {
    const page = new PdfPage(A4.height);
    this.pages.push(page);
    return page;
  }

  toBytes(): Uint8Array {
    if (this.pages.length === 0) this.addPage();
    // Object numbers: 1 catalog, 2 page tree, 3 and 4 fonts, 5 info, then a page and its
    // content stream for each page.
    const objects: string[] = [];
    const pageRefs = this.pages.map((_, i) => `${6 + i * 2} 0 R`);
    objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
    objects[2] = `<< /Type /Pages /Kids [${pageRefs.join(" ")}] /Count ${this.pages.length} >>`;
    objects[3] =
      "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>";
    objects[4] =
      "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>";
    objects[5] = `<< /Title (${escape(toWinAnsi(this.title))}) /Producer (Ledge) >>`;
    this.pages.forEach((page, i) => {
      const pageNo = 6 + i * 2;
      const content = page.ops.join("\n");
      objects[pageNo] =
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${A4.width} ${A4.height}] ` +
        `/Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${pageNo + 1} 0 R >>`;
      // Content is plain ASCII (toWinAnsi), so its length in characters is its length in bytes.
      objects[pageNo + 1] = `<< /Length ${content.length} >>\nstream\n${content}\nendstream`;
    });

    let out = "%PDF-1.4\n";
    const offsets: number[] = [];
    for (let i = 1; i < objects.length; i++) {
      offsets[i] = out.length;
      out += `${i} 0 obj\n${objects[i]}\nendobj\n`;
    }
    const xref = out.length;
    out += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
    for (let i = 1; i < objects.length; i++) {
      out += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
    }
    out += `trailer\n<< /Size ${objects.length} /Root 1 0 R /Info 5 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
    // Everything above is ASCII, so one character is one byte.
    return new TextEncoder().encode(out);
  }
}
