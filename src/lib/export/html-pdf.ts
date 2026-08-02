import { readFileSync } from "fs";
import path from "path";
import puppeteer, { type Browser } from "puppeteer";
import { getEmbeddedFontsCss } from "./fonts";

let browserPromise: Promise<Browser> | null = null;
let cachedLogoDataUri: string | null = null;

/**
 * Bundeltes Standard-Logo als Base64-Data-URI, damit relative src="logo-lockup.png"-Referenzen ohne
 * Basis-URL rendern (Puppeteer setContent hat keine). Auch von case-pdf.ts genutzt, wenn keine
 * praxisspezifische Logo-Datei hinterlegt ist.
 */
export function getLogoDataUri(): string {
  if (!cachedLogoDataUri) {
    const pngPath = path.join(process.cwd(), "src", "lib", "export", "templates", "assets", "logo-lockup.png");
    const png = readFileSync(pngPath).toString("base64");
    cachedLogoDataUri = `data:image/png;base64,${png}`;
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
 *
 * `htmlFields` funktioniert wie `fields`, setzt aber innerHTML statt textContent auf
 * `[data-html-field="key"]`-Elementen — für Inhalte mit variabler Zeilenanzahl (z.B. Tabellenzeilen),
 * die sich nicht durch reinen Text-Ersatz abbilden lassen.
 */
export async function renderHtmlTemplateToPdf(
  templateHtml: string,
  fields: Record<string, string>,
  htmlFields?: Record<string, string>
): Promise<Buffer> {
  const html = templateHtml
    .replace("</head>", `<style>${getEmbeddedFontsCss()}</style></head>`)
    .replace('src="logo-lockup.png"', `src="${getLogoDataUri()}"`);

  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setContent(html, { waitUntil: "load" });
    await page.evaluate(
      (values: Record<string, string>, htmlValues: Record<string, string>) => {
        for (const [key, value] of Object.entries(values)) {
          const el = document.querySelector(`[data-field="${key}"]`);
          if (!el) continue;
          if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) el.value = value;
          else el.textContent = value;
        }
        for (const [key, value] of Object.entries(htmlValues)) {
          const el = document.querySelector(`[data-html-field="${key}"]`);
          if (!el) continue;
          el.innerHTML = value;
        }
      },
      fields,
      htmlFields ?? {}
    );

    const pdf = await page.pdf({ format: "A4", printBackground: true });
    return Buffer.from(pdf);
  } finally {
    await page.close();
  }
}
