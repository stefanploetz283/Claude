import type { Metadata, Viewport } from "next";
import { Outfit, Caveat } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { ServiceWorkerRegistration } from "@/components/service-worker-registration";

const outfit = Outfit({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-outfit" });
// Skript-Akzentschrift, exakt wie im Flyer - bewusst sparsam eingesetzt (nur die Begrüßung auf dem
// Dashboard), siehe src/app/(app)/dashboard/greeting-header.tsx.
const caveat = Caveat({ subsets: ["latin"], weight: ["600", "700"], variable: "--font-caveat" });

export const metadata: Metadata = {
  title: "Fallverwaltung",
  description: "Fallverwaltung für sozialpädagogische Praxis",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Fallverwaltung",
  },
};

export const viewport: Viewport = {
  themeColor: "#204D4B",
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
