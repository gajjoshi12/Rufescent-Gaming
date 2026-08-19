import type { MetadataRoute } from "next";

/**
 * Web app manifest.
 *
 * `display: standalone` is what makes an iOS home-screen shortcut open
 * without Safari chrome. Camera capture works in an installed PWA on
 * iOS 14.3 and later; screen capture does not, because no iOS browser
 * implements getDisplayMedia.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Rufescent Gaming",
    short_name: "Rufescent",
    description:
      "Exchange and fixed odds, casino, poker and daily fantasy. 18+ only. Please gamble responsibly.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#08070a",
    theme_color: "#08070a",
    categories: ["games", "entertainment"],
    icons: [
      {
        src: "/logo.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/favicon.ico",
        sizes: "16x16 32x32 48x48 64x64 128x128 256x256",
        type: "image/x-icon",
      },
    ],
  };
}
