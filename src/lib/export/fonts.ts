import { readFileSync } from "fs";
import path from "path";

function toBase64(fontPackage: string, filename: string): string {
  const filePath = path.join(process.cwd(), "node_modules", "@fontsource", fontPackage, "files", filename);
  return readFileSync(filePath).toString("base64");
}

let cachedCss: string | null = null;

/**
 * Selbstgehostete Outfit-Schriftschnitte als Base64-@font-face-Block, damit PDF-Dokumente
 * unabhängig von Internetzugriff und Systemschriften exakt wie im Corporate Design rendern.
 */
export function getEmbeddedFontsCss(): string {
  if (cachedCss) return cachedCss;

  const regular = toBase64("outfit", "outfit-latin-400-normal.woff2");
  const medium = toBase64("outfit", "outfit-latin-500-normal.woff2");
  const semiBold = toBase64("outfit", "outfit-latin-600-normal.woff2");
  const bold = toBase64("outfit", "outfit-latin-700-normal.woff2");

  cachedCss = `
    @font-face {
      font-family: 'Outfit';
      font-weight: 400;
      font-style: normal;
      src: url(data:font/woff2;base64,${regular}) format('woff2');
    }
    @font-face {
      font-family: 'Outfit';
      font-weight: 500;
      font-style: normal;
      src: url(data:font/woff2;base64,${medium}) format('woff2');
    }
    @font-face {
      font-family: 'Outfit';
      font-weight: 600;
      font-style: normal;
      src: url(data:font/woff2;base64,${semiBold}) format('woff2');
    }
    @font-face {
      font-family: 'Outfit';
      font-weight: 700;
      font-style: normal;
      src: url(data:font/woff2;base64,${bold}) format('woff2');
    }
  `;
  return cachedCss;
}
