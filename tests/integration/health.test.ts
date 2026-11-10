import { describe, expect, it } from "vitest";
import { GET } from "@/app/api/health/route";

describe("GET /api/health", () => {
  it("answers 200 when the database is reachable, and is never cached", async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ status: "ok" });
  });
});
