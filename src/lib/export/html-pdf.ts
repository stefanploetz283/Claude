import { readFileSync } from "fs";
import path from "path";
import puppeteer, { type Browser } from "puppeteer";
import { getEmbeddedFontsCss } from "./fonts";

let browserPromise: Promise<Browser> | null = null;
let cachedLogoDataUri: string | null = null;

/** Logo als Base64-Data-URI, damit relative src="logo.svg"-Referenzen ohne Basis-URL rendern (Puppeteer setContent hat keine). */
function getLogoDataUri(): string {
  if (!cachedLogoDataUri) {
    const svgPath = path.join(process.cwd(), "src", "lib", "export", "templates", "logo.svg");
    const svg = readFileSync(svgPath).toString("base64");
    cachedLogoDataUri = `data:image/svg+xml;base64,${svg}`;
  }
  return cachedLogoDataUri;
}

function getBrowser(): Promise<Browser> {
  if (!browserPromise) {
    browserPromise = puppeteer.launch({ headless: true, args: ["--no-sandbox", "--disable-setuid-sandbox"] });
  }
  return browserPromise;
}

/**
 * Rendert eine Vorlage aus der Komponenten-Bibliothek (data-field-Attribute) mit echtem Chromium
 * (statt wkhtmltopdf) zu PDF, damit CSS-Variablen/Grid/Flexbox exakt wie spezifiziert dargestellt werden.
 */
export async function renderHtmlTemplateToPdf(templateHtml: string, fields: Record<string, string>): Promise<Buffer> {
  const html = templateHtml
    .replace("</head>", `<style>${getEmbeddedFontsCss()}</style></head>`)
    .replace('src="logo.svg"', `src="${getLogoDataUri()}"`);

  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setContent(html, { waitUntil: "load" });
    await page.evaluate((values: Record<string, string>) => {
      for (const [key, value] of Object.entries(values)) {
        const el = document.querySelector(`[data-field="${key}"]`);
        if (!el) continue;
        if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) el.value = value;
        else el.textContent = value;
      }
    }, fields);

    const pdf = await page.pdf({ format: "A4", printBackground: true });
    return Buffer.from(pdf);
  } finally {
    await page.close();
  }
}
