import { describe, expect, it } from "vitest";
import { highlightParts, matches, searchWords, snippet } from "./search-text";

describe("searchWords", () => {
  it("keeps letters and digits only", () => {
    expect(searchWords("  pay  rent!% 42 ")).toEqual(["pay", "rent", "42"]);
  });
});

describe("highlightParts", () => {
  it("marks words that start with a search word, ignoring case", () => {
    expect(highlightParts("Send Invoice to Kiran", ["invoice"])).toEqual([
      { text: "Send ", match: false },
      { text: "Invoice", match: true },
      { text: " to Kiran", match: false },
    ]);
    expect(highlightParts("Buy groceries", ["gro"])).toEqual([
      { text: "Buy ", match: false },
      { text: "gro", match: true },
      { text: "ceries", match: false },
    ]);
  });

  it("does not match inside a word", () => {
    expect(highlightParts("Reinvoice", ["invoice"])).toEqual([{ text: "Reinvoice", match: false }]);
  });

  it("treats regex characters in words as plain text", () => {
    expect(highlightParts("a.b", ["a.b"])[0]?.match).toBe(true);
  });
});

describe("snippet", () => {
  it("shows the text around the first match", () => {
    const text = "Remember to match every invoice number against the bank statement this time";
    expect(snippet(text, ["invoice"], 12)).toBe("…match every invoice number agai…");
  });

  it("is null when nothing matches", () => {
    expect(snippet("nothing here", ["invoice"])).toBeNull();
    expect(matches("nothing here", ["invoice"])).toBe(false);
  });
});
