"use client";

import { useEffect } from "react";

/**
 * Registers `/sw.js` (docs/pwa-spec.md) so Ledge can be installed and shows an offline page.
 * Production only: in development a worker would fight hot reload and serve stale files.
 * Browsers ignore this over plain http (except localhost), so it only takes effect behind HTTPS.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
      // Not installable here (for example plain http); the website keeps working.
    });
  }, []);

  return null;
}
