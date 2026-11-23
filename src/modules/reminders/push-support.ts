/**
 * Pure helpers for Settings › Notifications (docs/reminders-spec.md §2, §5): what this browser can
 * do about push, the application server key in the form the browser wants, and the words for the
 * default reminder.
 */

export type PushSupport = "unsupported" | "ios-install" | "denied" | "ready";

export type PushEnvironment = {
  userAgent: string;
  platform: string;
  maxTouchPoints: number;
  /** navigator.standalone or display-mode: standalone. */
  standalone: boolean;
  hasServiceWorker: boolean;
  hasPushManager: boolean;
  hasNotification: boolean;
  permission: "default" | "granted" | "denied" | null;
};

/** iPhone, iPad and iPod (an iPad can claim to be a Mac, so touch points are checked too). */
export function isIosDevice(
  env: Pick<PushEnvironment, "userAgent" | "platform" | "maxTouchPoints">,
): boolean {
  if (/iPhone|iPad|iPod/.test(env.userAgent)) return true;
  return env.platform === "MacIntel" && env.maxTouchPoints > 1;
}

/**
 * On an iPhone web push works only for an app added to the Home Screen (iOS 16.4 or later), so that
 * case is checked before "unsupported": in a Safari tab the push API is simply missing.
 */
export function detectPushSupport(env: PushEnvironment): PushSupport {
  if (isIosDevice(env) && !env.standalone) return "ios-install";
  if (!env.hasServiceWorker || !env.hasPushManager || !env.hasNotification) return "unsupported";
  if (env.permission === "denied") return "denied";
  return "ready";
}

/** The VAPID public key (base64url) as the bytes `pushManager.subscribe` needs. */
export function urlBase64ToUint8Array(base64Url: string): Uint8Array<ArrayBuffer> {
  const padded = base64Url + "=".repeat((4 - (base64Url.length % 4)) % 4);
  const raw = atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
  return out;
}

/** The choices for the default reminder, in the order Settings shows them. */
export const REMINDER_DEFAULT_OPTIONS: { value: string; label: string }[] = [
  { value: "none", label: "None" },
  { value: "at_due", label: "At due time" },
  { value: "before:5", label: "5 minutes before" },
  { value: "before:10", label: "10 minutes before" },
  { value: "before:15", label: "15 minutes before" },
  { value: "before:30", label: "30 minutes before" },
  { value: "before:60", label: "1 hour before" },
  { value: "before:120", label: "2 hours before" },
  { value: "before:1440", label: "1 day before" },
];
