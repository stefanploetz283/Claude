import type { Metadata, Viewport } from "next";
import { Outfit, Caveat } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { ServiceWorkerRegistration } from "@/components/service-worker-registration";

const outfit = Outfit({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-outfit" });
// Skript-Akzentschrift, exakt wie im Flyer - bewusst sparsam eingesetzt (nur die Begrüßung auf der
// Heute-Seite), siehe src/app/(app)/heute/heute-hero.tsx.
const caveat = Caveat({ subsets: ["latin"], weight: ["600", "700"], variable: "--font-caveat" });

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
    <html lang="de" className={`h-full antialiased ${outfit.variable} ${caveat.variable}`}>
      <body className="min-h-full flex flex-col">
        <ServiceWorkerRegistration />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
