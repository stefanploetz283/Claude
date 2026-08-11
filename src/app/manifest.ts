import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Praxis für Systemische Entwicklung – Fallverwaltung",
    short_name: "Fallverwaltung",
    description: "Fallverwaltung für die Praxis für Systemische Entwicklung.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#F5F0E8",
    theme_color: "#204D4B",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
