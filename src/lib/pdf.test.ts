import { describe, expect, it } from "vitest";
import { PdfDocument, fitText, textWidth, toWinAnsi } from "./pdf";

const decode = (bytes: Uint8Array) => new TextDecoder().decode(bytes);

describe("toWinAnsi", () => {
  it("keeps printable ASCII and spells common symbols in ASCII", () => {
    expect(toWinAnsi("Food & Groceries")).toBe("Food & Groceries");
    expect(toWinAnsi("1,23,456.00 ₹ – —")).toBe("1,23,456.00 Rs  - -");
  });

  it("replaces anything the standard fonts cannot draw", () => {
    expect(toWinAnsi("café 😀")).toBe("caf? ?");
  });
});

describe("textWidth", () => {
  it("uses the Helvetica metrics", () => {
    expect(textWidth("0", 10)).toBeCloseTo(5.56);
    expect(textWidth("Ledge", 14, "bold")).toBeCloseTo(((611 + 556 + 611 + 611 + 556) * 14) / 1000);
    expect(textWidth("i", 1000)).toBe(222);
    expect(textWidth("~", 1000, "bold")).toBe(584);
  });

  it("fits long text with an ellipsis", () => {
    const fitted = fitText("Dining & Entertainment and much more besides", 80, 9.5);
    expect(fitted.endsWith("...")).toBe(true);
    expect(textWidth(fitted, 9.5)).toBeLessThanOrEqual(80);
    expect(fitText("Short", 80, 9.5)).toBe("Short");
  });
});

describe("PdfDocument", () => {
  it("writes a well-formed file whose cross-reference table points at every object", () => {
    const doc = new PdfDocument("Test (report)");
    const page = doc.addPage();
    page.text(48, 60, "Hello (world) \\ back", { size: 12, font: "bold", align: "right" });
    page.rect(48, 80, 100, 20, [0.9, 0.9, 0.9]);
    page.line(48, 120, 200, 120);
    doc.addPage().text(48, 60, "Second page");
    const text = decode(doc.toBytes());

    expect(text.startsWith("%PDF-1.4\n")).toBe(true);
    expect(text.trimEnd().endsWith("%%EOF")).toBe(true);
    expect(text).toContain("/Count 2");
    // Parentheses and backslashes in text are escaped.
    expect(text).toContain("(Hello \\(world\\) \\\\ back) Tj");
    expect(text).toContain("/Title (Test \\(report\\))");

    const startxref = Number(/startxref\n(\d+)/.exec(text)?.[1]);
    expect(text.slice(startxref, startxref + 4)).toBe("xref");
    const entries = [...text.slice(startxref).matchAll(/^(\d{10}) 00000 n $/gm)].map((m) =>
      Number(m[1]),
    );
    expect(entries).toHaveLength(9); // catalog, pages, 2 fonts, info, 2 x (page + content)
    entries.forEach((offset, i) => {
      expect(text.slice(offset).startsWith(`${i + 1} 0 obj`)).toBe(true);
    });
    // Each content stream's /Length is exact.
    for (const m of text.matchAll(/<< \/Length (\d+) >>\nstream\n/g)) {
      const start = (m.index ?? 0) + m[0].length;
      expect(text.slice(start + Number(m[1]), start + Number(m[1]) + 10)).toBe("\nendstream");
    }
  });

  it("writes one blank page when nothing was drawn", () => {
    expect(decode(new PdfDocument("Empty").toBytes())).toContain("/Count 1");
  });
});
