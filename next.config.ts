import type { NextConfig } from "next";

const isProduction = process.env.NODE_ENV === "production";

/**
 * Content Security Policy. Next.js puts small inline scripts in every page (it passes data to the
 * browser that way), so `script-src` needs 'unsafe-inline'; a per-request nonce would remove that
 * and is parked in docs/ideas.md. Everything else is locked to this site: no framing, no plugins,
 * no other origins for scripts, fonts, images or requests. Development also needs eval and a
 * websocket for hot reload.
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isProduction ? "" : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  `connect-src 'self'${isProduction ? "" : " ws: wss:"}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
  // Browsers ignore this over plain http, so it only takes effect behind the HTTPS tunnel.
  ...(isProduction ? [{ key: "Strict-Transport-Security", value: "max-age=15552000" }] : []),
];

const nextConfig: NextConfig = {
  // The end-to-end tests run their own dev server next to yours, so they build into another folder.
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  // A self-contained server (server.js plus only the files it needs) for the Docker image.
  output: "standalone",
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
