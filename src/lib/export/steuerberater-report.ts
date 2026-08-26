import { readFileSync } from "fs";
import path from "path";
import { renderHtmlTemplateToPdf } from "./html-pdf";
import { computeCockpitKernzahlen, ampelLiquiditaet, type PeriodType } from "@/lib/betriebscockpit";

const TEMPLATE_PATH = path.join(process.cwd(), "src", "lib", "export", "templates", "steuerberater-report.html");

const MONTH_NAMES = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];

function eur(value: number): string {
  return value.toLocaleString("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
}

const AMPEL_LABEL: Record<string, string> = { gruen: "grün", gelb: "gelb", rot: "rot" };

function periodLabel(type: PeriodType, year: number, index: number): string {
  if (type === "month") return `${MONTH_NAMES[index - 1]} ${year}`;
  if (type === "quarter") return `Q${index} ${year}`;
  return `${year}`;
}

/** Steuerberater-Report-PDF: bündelt Quote, Kosten-Soll-Ist, Umsatz/Faktor/Gewinn und Auslastungsrisiko
 * für das nächste Steuerberater-Meeting. Steuerrücklagen-Schätzung folgt in einer späteren Ausbaustufe
 * (siehe Phasenplan) - Hinweistext markiert das im PDF transparent statt eine leere Zeile zu zeigen. */
export async function buildSteuerberaterReportPdf(periodType: PeriodType, year: number, periodIndex: number, now: Date = new Date()): Promise<Buffer> {
  const k = await computeCockpitKernzahlen(periodType, year, periodIndex, now);

  const kostenRows = (k.kostenSollIst?.zeilen ?? [])
    .map(
      (z) => `<tr>
        <td>${z.label}</td>
        <td class="right">${eur(z.geplantJahr)}</td>
        <td class="right">${eur(z.hochrechnungJahr)}</td>
        <td class="right">${z.abweichungEuro >= 0 ? "+" : ""}${eur(z.abweichungEuro)} (${z.abweichungProzent >= 0 ? "+" : ""}${z.abweichungProzent.toFixed(1)} %)</td>
      </tr>`
    )
    .join("");

  const hinweisTeile = [
    "Hochrechnungen basieren auf dem bisherigen Jahresverlauf (Ist ÷ bisherige Arbeitstage × Gesamt-Arbeitstage), Betriebsferien ausgeklammert.",
    "Steuerrücklagen-Schätzung ist in dieser Version des Cockpits noch nicht enthalten und folgt in einer späteren Ausbaustufe.",
    "Dieser Report ersetzt keine Buchhaltung oder Steuerberatung.",
  ];

  const pdf = await renderHtmlTemplateToPdf(
    readFileSync(TEMPLATE_PATH, "utf-8"),
    {
      untertitel: `Zeitraum: ${periodLabel(periodType, year, periodIndex)} · Erstellt am ${now.toLocaleDateString("de-DE")}`,
      ist_quote: k.teamQuote.teamIstQuote != null ? `${(k.teamQuote.teamIstQuote * 100).toFixed(1)} %` : "–",
      kosten_hochgerechnet: k.kostenSollIst ? eur(k.kostenSollIst.hochrechnungGesamtkostenJahr) : "–",
      umsatz_hochgerechnet: eur(k.umsatz.hochrechnungJahr),
      faktor_hochgerechnet: k.faktorHochgerechnet != null ? k.faktorHochgerechnet.toFixed(2) : "–",
      gewinn_hochgerechnet: k.hochrechnungGewinnJahr != null ? eur(k.hochrechnungGewinnJahr) : "–",
      break_even_quote: k.breakEvenQuote != null ? `${(k.breakEvenQuote * 100).toFixed(1)} %` : "–",
      auslastungsreserve: k.auslastungsreservePunkte != null ? `${k.auslastungsreservePunkte >= 0 ? "+" : ""}${k.auslastungsreservePunkte.toFixed(1)} Pkt.` : "–",
      liquiditaets_reichweite:
        k.liquiditaetsReichweiteMonate != null
          ? `${k.liquiditaetsReichweiteMonate.toFixed(1)} Monate (${AMPEL_LABEL[ampelLiquiditaet(k.liquiditaetsReichweiteMonate)]})`
          : "–",
      hinweis_text: hinweisTeile.join(" "),
      footer_text: `Praxis für Systemische Entwicklung · Steuerberater-Report · Seite 1 von 1`,
    },
    { kosten_zeilen: kostenRows || `<tr><td colspan="4">Noch keine Kalkulationsversion hinterlegt.</td></tr>` }
  );

  return pdf;
}
