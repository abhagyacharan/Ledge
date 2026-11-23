import { describe, expect, it } from "vitest";
import { currentSection } from "./sections";

describe("currentSection", () => {
  it("treats /settings as Account and finds each section by its address", () => {
    expect(currentSection("/settings")).toBe("account");
    expect(currentSection("/settings/security")).toBe("security");
    expect(currentSection("/settings/journal-lock")).toBe("journal-lock");
    expect(currentSection("/settings/about")).toBe("about");
    expect(currentSection("/settings/nope")).toBeNull();
  });
});
