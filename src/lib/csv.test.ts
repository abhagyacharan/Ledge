import { describe, expect, it } from "vitest";
import { isTimeZone } from "@/modules/account/schema";
import { csvField, toCsv } from "./csv";

describe("csv", () => {
  it("quotes only what needs quoting", () => {
    expect(csvField("plain")).toBe("plain");
    expect(csvField('say "hi", ok')).toBe('"say ""hi"", ok"');
    expect(csvField("two\nlines")).toBe('"two\nlines"');
    expect(csvField(null)).toBe("");
    expect(csvField(42)).toBe("42");
  });

  it("defuses spreadsheet formulas", () => {
    expect(csvField("=SUM(A1)")).toBe("'=SUM(A1)");
    expect(csvField("-5")).toBe("'-5");
    expect(csvField(-5)).toBe("-5");
  });

  it("writes a header and rows with CRLF", () => {
    expect(toCsv(["a", "b"], [["1", null]])).toBe("a,b\r\n1,\r\n");
  });
});

describe("isTimeZone", () => {
  it("knows real zones and refuses made-up ones", () => {
    expect(isTimeZone("Asia/Kolkata")).toBe(true);
    expect(isTimeZone("Mars/Olympus")).toBe(false);
  });
});
