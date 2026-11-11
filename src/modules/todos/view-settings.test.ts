import { describe, expect, it } from "vitest";
import {
  DEFAULT_VIEW_SETTINGS,
  isDefaultView,
  parseViewSettings,
  settingsFromSearchParams,
  settingsToSearchParams,
} from "./view-settings";

describe("parseViewSettings", () => {
  it("returns the defaults for empty, missing or garbage input", () => {
    expect(parseViewSettings({})).toEqual(DEFAULT_VIEW_SETTINGS);
    expect(parseViewSettings(null)).toEqual(DEFAULT_VIEW_SETTINGS);
    expect(parseViewSettings({ sort: "sideways" })).toEqual(DEFAULT_VIEW_SETTINGS);
    expect(parseViewSettings("nope")).toEqual(DEFAULT_VIEW_SETTINGS);
  });

  it("keeps valid saved values and fills in the rest", () => {
    const parsed = parseViewSettings({ sort: "due", showCompleted: true });
    expect(parsed).toMatchObject({ sort: "due", group: "none", showCompleted: true });
  });
});

describe("URL round trip", () => {
  it("encodes only what differs from the base, and reads it back", () => {
    const chosen = {
      ...DEFAULT_VIEW_SETTINGS,
      sort: "due" as const,
      group: "priority" as const,
      priority: 2,
      hasDue: "yes" as const,
      showCompleted: true,
    };
    const params = settingsToSearchParams(chosen, DEFAULT_VIEW_SETTINGS);
    expect(Object.fromEntries(params)).toEqual({
      sort: "due",
      group: "priority",
      priority: "2",
      due: "yes",
      done: "1",
    });
    const back = settingsFromSearchParams(Object.fromEntries(params), DEFAULT_VIEW_SETTINGS);
    expect(back).toEqual(chosen);
  });

  it("encodes nothing for the defaults", () => {
    expect(settingsToSearchParams(DEFAULT_VIEW_SETTINGS, DEFAULT_VIEW_SETTINGS).toString()).toBe(
      "",
    );
  });

  it("falls back to the base for invalid params", () => {
    const base = { ...DEFAULT_VIEW_SETTINGS, sort: "due" as const };
    expect(settingsFromSearchParams({ sort: "x", priority: "9" }, base)).toEqual(base);
    expect(settingsFromSearchParams({ group: "tag" }, base).group).toBe("none");
  });

  it("uses the base when a param is absent", () => {
    const base = { ...DEFAULT_VIEW_SETTINGS, sort: "due" as const };
    expect(settingsFromSearchParams({}, base)).toEqual(base);
    expect(
      settingsFromSearchParams({ done: "0" }, { ...base, showCompleted: true }).showCompleted,
    ).toBe(false);
  });

  it("reads the first value when a param is repeated", () => {
    expect(
      settingsFromSearchParams({ group: ["priority", "due"] }, DEFAULT_VIEW_SETTINGS).group,
    ).toBe("priority");
  });
});

describe("isDefaultView", () => {
  it("detects the default and anything else", () => {
    expect(isDefaultView(DEFAULT_VIEW_SETTINGS)).toBe(true);
    expect(isDefaultView({ ...DEFAULT_VIEW_SETTINGS, group: "priority" })).toBe(false);
    expect(isDefaultView({ ...DEFAULT_VIEW_SETTINGS, sort: "due" })).toBe(false);
    expect(isDefaultView({ ...DEFAULT_VIEW_SETTINGS, sort: "due" }, true)).toBe(true);
  });
});
