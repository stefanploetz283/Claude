import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PROS Jugendhilfe – Fallverwaltung",
    short_name: "PROS Jugendhilfe",
    description: "Fallverwaltung für PROS Jugendhilfe.",
    start_url: "/heute",
    display: "standalone",
    background_color: "#F7F3EA",
    theme_color: "#0B3D46",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
