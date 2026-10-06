import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Fit Log",
    short_name: "Fit Log",
    description: "Personal weight, body fat, and meal log.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#141414",
    theme_color: "#141414",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
