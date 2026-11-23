/**
 * Device rows in Settings › Sign-in & security (screen 9e): a plain name from the browser's user
 * agent ("Chrome on Windows"), never a place, and an icon kind. Pure, so it is unit tested.
 */
export type DeviceKind = "phone" | "tablet" | "computer";

export function describeDevice(userAgent: string | null | undefined): {
  name: string;
  kind: DeviceKind;
} {
  const ua = userAgent ?? "";
  const os = /iPad/.test(ua)
    ? "iPad"
    : /iPhone|iPod/.test(ua)
      ? "iPhone"
      : /Android/.test(ua)
        ? "Android"
        : /Windows/.test(ua)
          ? "Windows"
          : /CrOS/.test(ua)
            ? "ChromeOS"
            : /Mac OS X|Macintosh/.test(ua)
              ? "Mac"
              : /Linux/.test(ua)
                ? "Linux"
                : null;
  const browser = /Edg(e|A|iOS)?\//.test(ua)
    ? "Edge"
    : /OPR\/|Opera/.test(ua)
      ? "Opera"
      : /SamsungBrowser/.test(ua)
        ? "Samsung Internet"
        : /Firefox|FxiOS/.test(ua)
          ? "Firefox"
          : /Chrome|CriOS|Chromium/.test(ua)
            ? "Chrome"
            : /Safari/.test(ua)
              ? "Safari"
              : null;
  const tablet = os === "iPad" || (os === "Android" && !/Mobile/.test(ua));
  const kind: DeviceKind = tablet
    ? "tablet"
    : os === "iPhone" || os === "Android"
      ? "phone"
      : "computer";
  const name =
    browser && os ? `${browser} on ${os}` : (browser ?? (os ? `A browser on ${os}` : "A browser"));
  return { name, kind };
}

/** "Active now", "5 minutes ago", "2 hours ago", "Yesterday", "5 days ago", or a date. */
export function lastActive(at: Date, now: Date, locale: string, timeZone: string): string {
  const minutes = Math.floor((now.getTime() - at.getTime()) / 60_000);
  if (minutes < 5) return "Active now";
  if (minutes < 60) return `${minutes} minutes ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days} days ago`;
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone,
  }).format(at);
}
