import { vi } from "vitest";

/**
 * One stand-in for `web-push` shared by every test file. Test files run in one shared worker
 * (vitest.config.mts, `isolate: false`), so the first file to mock `web-push` decides what the push
 * sender loads for every later file; pointing all of them here keeps them on the same function.
 *
 *   vi.mock("web-push", async () => (await import("../helpers/web-push-mock")).webPushModule);
 *   import { sendNotification } from "../helpers/web-push-mock";
 */

export const sendNotification = vi.fn();

export const webPushModule = { sendNotification };
