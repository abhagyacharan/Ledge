import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("react-dom", () => ({ flushSync: (fn: () => void) => fn() }));

import { switchTheme } from "./theme-transition";

/** A tiny stand-in for the browser, enough for the helper (the real one is checked by hand). */
function browser({
  reduceMotion = false,
  transitions = true,
}: { reduceMotion?: boolean; transitions?: boolean } = {}) {
  const calls = { animate: [] as unknown[], toggled: [] as boolean[], started: 0 };
  const root = {
    classList: { toggle: (_: string, on: boolean) => calls.toggled.push(on) },
    style: {} as Record<string, string>,
    animate: (...args: unknown[]) => calls.animate.push(args),
  };
  const startViewTransition = (update: () => void) => {
    calls.started += 1;
    update();
    return { ready: Promise.resolve() };
  };
  vi.stubGlobal("window", {
    innerWidth: 1000,
    innerHeight: 800,
    matchMedia: (query: string) => ({
      matches: query.includes("reduce") ? reduceMotion : query.includes("dark") ? false : false,
    }),
  });
  vi.stubGlobal("document", {
    documentElement: root,
    ...(transitions ? { startViewTransition } : {}),
  });
  return { calls, root };
}

afterEach(() => vi.unstubAllGlobals());

describe("switchTheme", () => {
  it("grows a circle from the origin when the browser supports it", async () => {
    const { calls, root } = browser();
    const setTheme = vi.fn();
    switchTheme("dark", { x: 100, y: 700 }, setTheme);
    await Promise.resolve();
    await Promise.resolve();
    expect(setTheme).toHaveBeenCalledWith("dark");
    expect(calls.started).toBe(1);
    expect(calls.toggled).toEqual([true]);
    expect(root.style.colorScheme).toBe("dark");
    const [frames, options] = calls.animate[0] as [
      { clipPath: string[] },
      { pseudoElement: string },
    ];
    expect(options.pseudoElement).toBe("::view-transition-new(root)");
    // From a point to a circle reaching the farthest corner (here the top right).
    expect(frames.clipPath[0]).toBe("circle(0px at 100px 700px)");
    expect(frames.clipPath[1]).toBe(`circle(${Math.hypot(900, 700)}px at 100px 700px)`);
  });

  it("applies the system theme as light or dark by the device's setting", () => {
    const { calls } = browser();
    switchTheme("system", { x: 0, y: 0 }, vi.fn());
    expect(calls.toggled).toEqual([false]);
  });

  it("switches at once with reduced motion", () => {
    const { calls } = browser({ reduceMotion: true });
    const setTheme = vi.fn();
    switchTheme("dark", { x: 1, y: 1 }, setTheme);
    expect(setTheme).toHaveBeenCalledWith("dark");
    expect(calls.started).toBe(0);
  });

  it("switches at once when the browser has no view transitions, or no origin", () => {
    const old = browser({ transitions: false });
    const setTheme = vi.fn();
    switchTheme("light", { x: 1, y: 1 }, setTheme);
    expect(setTheme).toHaveBeenCalledWith("light");
    expect(old.calls.started).toBe(0);

    const { calls } = browser();
    const again = vi.fn();
    switchTheme("light", null, again);
    expect(again).toHaveBeenCalledWith("light");
    expect(calls.started).toBe(0);
  });
});
