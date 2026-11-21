import type { MetadataRoute } from "next";
import { APP_DESCRIPTION, APP_NAME } from "@/config/app";

/**
 * The web app manifest: what a phone reads when Ledge is added to the home screen. Without it
 * Android Chrome only has the small browser-tab icon and draws it on a light backdrop. With it, the
 * home-screen icon is the black tile with the logo (the maskable one fills whatever shape the phone
 * cuts out), and Ledge opens like an app, without the browser bar. Icons are made by
 * `scripts/make-icons.py`. The proxy lets this file and `/icons` through signed out, because the
 * phone fetches them without your cookies.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: APP_NAME,
    short_name: APP_NAME,
    description: APP_DESCRIPTION,
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    categories: ["productivity", "finance"],
    background_color: "#121514",
    theme_color: "#121514",
    // Long-press the home-screen icon (Android) for these.
    shortcuts: [
      { name: "Tasks", url: "/tasks", icons: [{ src: "/icons/ledge-192.png", sizes: "192x192" }] },
      {
        name: "Expense Tracker",
        url: "/expenses",
        icons: [{ src: "/icons/ledge-192.png", sizes: "192x192" }],
      },
      {
        name: "Journal",
        url: "/journal",
        icons: [{ src: "/icons/ledge-192.png", sizes: "192x192" }],
      },
    ],
    icons: [
      { src: "/icons/ledge-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/ledge-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icons/ledge-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
