import { readFileSync } from "fs";
import path from "path";

function toBase64(fontPackage: string, filename: string): string {
  const filePath = path.join(process.cwd(), "node_modules", "@fontsource", fontPackage, "files", filename);
  return readFileSync(filePath).toString("base64");
}

let cachedCss: string | null = null;

/**
 * Selbstgehostete Inter/Spectral-Schriftschnitte als Base64-@font-face-Block, damit PDF-Dokumente
 * unabhängig von Internetzugriff und Systemschriften exakt wie im Design-Briefing spezifiziert rendern.
 */
export function getEmbeddedFontsCss(): string {
  if (cachedCss) return cachedCss;

  const interRegular = toBase64("inter", "inter-latin-400-normal.woff2");
  const interSemiBold = toBase64("inter", "inter-latin-600-normal.woff2");
  const spectralSemiBold = toBase64("spectral", "spectral-latin-600-normal.woff2");
  const spectralBold = toBase64("spectral", "spectral-latin-700-normal.woff2");

  cachedCss = `
    @font-face {
      font-family: 'Inter';
      font-weight: 400;
      font-style: normal;
      src: url(data:font/woff2;base64,${interRegular}) format('woff2');
    }
    @font-face {
      font-family: 'Inter';
      font-weight: 600;
      font-style: normal;
      src: url(data:font/woff2;base64,${interSemiBold}) format('woff2');
    }
    @font-face {
      font-family: 'Spectral';
      font-weight: 600;
      font-style: normal;
      src: url(data:font/woff2;base64,${spectralSemiBold}) format('woff2');
    }
    @font-face {
      font-family: 'Spectral';
      font-weight: 700;
      font-style: normal;
      src: url(data:font/woff2;base64,${spectralBold}) format('woff2');
    }
  `;
  return cachedCss;
}
