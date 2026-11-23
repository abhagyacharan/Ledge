import { describe, expect, it } from "vitest";
import {
  detectPushSupport,
  isIosDevice,
  REMINDER_DEFAULT_OPTIONS,
  urlBase64ToUint8Array,
  type PushEnvironment,
} from "./push-support";
import { reminderDefaultSchema } from "./schema";

const chrome: PushEnvironment = {
  userAgent: "Mozilla/5.0 (Linux; Android 14) Chrome/130 Mobile Safari/537.36",
  platform: "Linux armv8l",
  maxTouchPoints: 5,
  standalone: false,
  hasServiceWorker: true,
  hasPushManager: true,
  hasNotification: true,
  permission: "default",
};
const iphone: PushEnvironment = {
  ...chrome,
  userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) Safari/605.1.15",
  platform: "iPhone",
};

describe("detectPushSupport", () => {
  it("is ready in a browser with push", () => {
    expect(detectPushSupport(chrome)).toBe("ready");
  });
  it("asks an iPhone tab to install first, even though push is missing there", () => {
    expect(detectPushSupport({ ...iphone, hasPushManager: false })).toBe("ios-install");
  });
  it("lets an installed iPhone app through", () => {
    expect(detectPushSupport({ ...iphone, standalone: true })).toBe("ready");
  });
  it("reports a browser without push as unsupported", () => {
    expect(detectPushSupport({ ...chrome, hasPushManager: false })).toBe("unsupported");
  });
  it("reports a blocked permission", () => {
    expect(detectPushSupport({ ...chrome, permission: "denied" })).toBe("denied");
  });
});

describe("isIosDevice", () => {
  it("spots an iPad that calls itself a Mac", () => {
    expect(isIosDevice({ userAgent: "Macintosh", platform: "MacIntel", maxTouchPoints: 5 })).toBe(
      true,
    );
    expect(isIosDevice({ userAgent: "Macintosh", platform: "MacIntel", maxTouchPoints: 0 })).toBe(
      false,
    );
  });
});

describe("urlBase64ToUint8Array", () => {
  it("decodes base64url with and without padding", () => {
    expect(Array.from(urlBase64ToUint8Array("-_8"))).toEqual([251, 255]);
    expect(Array.from(urlBase64ToUint8Array("AQID"))).toEqual([1, 2, 3]);
  });
});

describe("reminder choices", () => {
  it("every option is one the server accepts", () => {
    for (const o of REMINDER_DEFAULT_OPTIONS) {
      expect(reminderDefaultSchema.safeParse(o.value).success).toBe(true);
    }
  });
});
