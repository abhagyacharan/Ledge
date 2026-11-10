import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The end-to-end tests run their own dev server next to yours, so they build into another folder.
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
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
