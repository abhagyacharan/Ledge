import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { config, proxy } from "./proxy";

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
    "/forgot-password",
    "/reset-password",
    "/welcome",
    "/site/phone-home.png",
    "/api/reminders/00000000-0000-4000-8000-000000000000/done",
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

describe("proxy without a session cookie", () => {
  const visit = (path: string) => proxy(new NextRequest(new URL(path, "http://localhost:3000")));

  it("shows the public page at / without changing the address", () => {
    const res = visit("/");
    expect(res.headers.get("x-middleware-rewrite")).toBe("http://localhost:3000/welcome");
    expect(res.headers.get("location")).toBeNull();
  });

  it("still sends app pages to sign-in", () => {
    const res = visit("/tasks");
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost:3000/sign-in");
  });
});

describe("service worker privacy rule (docs/pwa-spec.md)", () => {
  const source = readFileSync(join(process.cwd(), "public", "sw.js"), "utf8");

  it("only handles navigations and static files", () => {
    expect(source).toContain('request.mode === "navigate"');
    expect(source).toContain("/_next/static/");
    // The worker's own POSTs for the reminder buttons are the only /api use; nothing is cached.
    expect([...source.matchAll(/\/api\/[a-z]+/g)].map((m) => m[0])).toEqual(["/api/reminders"]);
  });

  it("never stores a page: the only cache.put is for static files", () => {
    expect(source.match(/cache\.put\(/g)).toHaveLength(1);
    expect(source).toContain("isStaticAsset(url)");
  });
});
