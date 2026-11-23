import { describe, expect, it } from "vitest";
import { describeDevice, lastActive } from "./devices";

const UA = {
  chromeWindows:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  edgeWindows:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0",
  pixel:
    "Mozilla/5.0 (Linux; Android 15; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
  ipad: "Mozilla/5.0 (iPad; CPU OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1",
  iphoneChrome:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/131.0.0.0 Mobile/15E148 Safari/604.1",
  macFirefox: "Mozilla/5.0 (Macintosh; Intel Mac OS X 14.7; rv:133.0) Gecko/20100101 Firefox/133.0",
};

describe("describeDevice", () => {
  it("names the browser and the system", () => {
    expect(describeDevice(UA.chromeWindows)).toEqual({
      name: "Chrome on Windows",
      kind: "computer",
    });
    expect(describeDevice(UA.edgeWindows).name).toBe("Edge on Windows");
    expect(describeDevice(UA.pixel)).toEqual({ name: "Chrome on Android", kind: "phone" });
    expect(describeDevice(UA.ipad)).toEqual({ name: "Safari on iPad", kind: "tablet" });
    expect(describeDevice(UA.iphoneChrome)).toEqual({ name: "Chrome on iPhone", kind: "phone" });
    expect(describeDevice(UA.macFirefox).name).toBe("Firefox on Mac");
  });
  it("falls back to plain words when it can't tell", () => {
    expect(describeDevice(null)).toEqual({ name: "A browser", kind: "computer" });
    expect(describeDevice("curl/8.0")).toEqual({ name: "A browser", kind: "computer" });
  });
});

describe("lastActive", () => {
  const now = new Date("2026-11-23T12:00:00Z");
  const ago = (minutes: number) => new Date(now.getTime() - minutes * 60_000);
  const say = (minutes: number) => lastActive(ago(minutes), now, "en-IN", "Asia/Kolkata");
  it("says it in words", () => {
    expect(say(1)).toBe("Active now");
    expect(say(20)).toBe("20 minutes ago");
    expect(say(60)).toBe("1 hour ago");
    expect(say(150)).toBe("2 hours ago");
    expect(say(60 * 30)).toBe("Yesterday");
    expect(say(60 * 24 * 5)).toBe("5 days ago");
    expect(say(60 * 24 * 40)).toBe("14 Oct 2026");
  });
});
