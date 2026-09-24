import type { Metadata, Viewport } from "next";
import { Manrope, Caveat, DM_Serif_Display } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { ServiceWorkerRegistration } from "@/components/service-worker-registration";

// UI-/Fließtext-Schrift laut design/PROS-DESIGN-SYSTEM.md Abschnitt 5 - ersetzt Outfit.
const manrope = Manrope({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-manrope" });
// Skript-Akzentschrift, exakt wie im Flyer - bewusst sparsam eingesetzt (nur die Begrüßung auf der
// Heute-Seite), siehe src/app/(app)/heute/heute-hero.tsx.
const caveat = Caveat({ subsets: ["latin"], weight: ["600", "700"], variable: "--font-caveat" });
// Display-Schrift für den großen Hero-Namen und das Hero-Zitat (design/PROS-DESIGN-SYSTEM.md Abschnitt 5).
const dmSerifDisplay = DM_Serif_Display({ subsets: ["latin"], weight: ["400"], style: ["normal", "italic"], variable: "--font-dm-serif-display" });

export const metadata: Metadata = {
  title: "PROS Jugendhilfe – Fallverwaltung",
  description: "Fallverwaltung für PROS Jugendhilfe",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "PROS Jugendhilfe",
  },
};

export const viewport: Viewport = {
  themeColor: "#0B3D46",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" className={`h-full antialiased ${manrope.variable} ${caveat.variable} ${dmSerifDisplay.variable}`}>
      <body className="min-h-full flex flex-col">
        <ServiceWorkerRegistration />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
