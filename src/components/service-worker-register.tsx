"use client";

import { useEffect } from "react";

/**
 * Registers `/sw.js` (docs/pwa-spec.md) so Ledge can be installed, shows an offline page and can
 * receive reminders (docs/reminders-spec.md). In production as always. In development a caching
 * worker would fight hot reload, so it is registered only when push is set up, as `/sw.js?dev=1`,
 * which skips all caching and the offline page.
 * Browsers ignore this over plain http (except localhost), so it only takes effect behind HTTPS.
 */
export function ServiceWorkerRegister({ pushConfigured = false }: { pushConfigured?: boolean }) {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const production = process.env.NODE_ENV === "production";
    if (!production && !pushConfigured) return;
    const url = production ? "/sw.js" : "/sw.js?dev=1";
    navigator.serviceWorker.register(url, { scope: "/" }).catch(() => {
      // Not installable here (for example plain http); the website keeps working.
    });
  }, [pushConfigured]);

  return null;
}
