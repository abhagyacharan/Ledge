import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { config } from "./proxy";

// The matcher lists what the proxy protects; turn it into a regex to check paths against it.
const protectedPath = new RegExp(`^${config.matcher[0]}$`);

describe("proxy matcher", () => {
  it.each([
    "/sw.js",
    "/offline.html",
    "/manifest.webmanifest",
    "/icons/ledge-192.png",
    "/api/health",
    "/sign-in",
  ])("lets %s through signed out", (path) => {
    expect(protectedPath.test(path)).toBe(false);
  });

  it.each(["/", "/tasks", "/expenses", "/journal", "/api/export/everything"])(
    "still protects %s",
    (path) => {
      expect(protectedPath.test(path)).toBe(true);
    },
  );
});

describe("service worker privacy rule (docs/pwa-spec.md)", () => {
  const source = readFileSync(join(process.cwd(), "public", "sw.js"), "utf8");

  it("only handles navigations and static files", () => {
    expect(source).toContain('request.mode === "navigate"');
    expect(source).toContain("/_next/static/");
    expect(source).not.toMatch(/\/api\//);
  });

  it("never stores a page: the only cache.put is for static files", () => {
    expect(source.match(/cache\.put\(/g)).toHaveLength(1);
    expect(source).toContain("isStaticAsset(url)");
  });
});
