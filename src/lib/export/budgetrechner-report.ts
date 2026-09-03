import { readFileSync } from "fs";
import path from "path";
import { renderHtmlTemplateToPdf } from "./html-pdf";
import { computeBudgetDashboard, computeNichtEingeplant, jahrBounds } from "@/lib/budgetrechner/calc";
import { AMPEL_HEX, QUELLE_AUSGABE_LABEL, eur, prozentText } from "@/lib/budgetrechner/labels";

const TEMPLATE_PATH = path.join(process.cwd(), "src", "lib", "export", "templates", "budgetrechner-report.html");

function esc(s: string): string {
  return s.replace(/[&<>]/g, (c) => (c === "&" ? "&amp;" : c === "<" ? "&lt;" : "&gt;"));
}

/** Budgetrechner-Bericht: Budget-Ist-Vergleich je Position + Liste nicht eingeplanter Kosten, für die
 * Vorbereitung auf ReKo-Gespräche. Zeitraum betrifft nur die "nicht eingeplant"-Liste; der Budget-Ist-
 * Vergleich ist immer jahresbezogen (Jahresbudgets). */
export async function buildBudgetrechnerReportPdf(jahr: number, von: Date, bis: Date, now: Date = new Date()): Promise<Buffer> {
  const [dashboard, nichtEingeplant] = await Promise.all([computeBudgetDashboard(jahr), computeNichtEingeplant(von, bis)]);

  const budgetZeilen =
    dashboard.zeilen
      .map(
        (z) => `<tr>
        <td><span class="amp" style="background:${AMPEL_HEX[z.ampel]}"></span>${esc(z.name)}</td>
        <td class="right">${eur(z.jahresbudget)}</td>
        <td class="right">${eur(z.verbraucht)}</td>
        <td class="right">${z.rest < 0 ? "−" : ""}${eur(Math.abs(z.rest))}</td>
        <td class="right">${prozentText(z.prozent)}</td>
      </tr>`
      )
      .join("") || `<tr><td colspan="5">Noch keine Budget-Positionen für ${jahr} hinterlegt.</td></tr>`;

  const budgetSumme = dashboard.zeilen.length
    ? `<tr><td>Summe</td>
        <td class="right">${eur(dashboard.summeBudget)}</td>
        <td class="right">${eur(dashboard.summeVerbraucht)}</td>
        <td class="right">${dashboard.summeRest < 0 ? "−" : ""}${eur(Math.abs(dashboard.summeRest))}</td>
        <td class="right">${prozentText(dashboard.summeBudget > 0 ? (dashboard.summeVerbraucht / dashboard.summeBudget) * 100 : 0)}</td></tr>`
    : "";

  const nichtEingeplantZeilen =
    nichtEingeplant.eintraege
      .map(
        (e) => `<tr>
        <td>${e.datum.toLocaleDateString("de-DE")}</td>
        <td>${esc(e.beschreibung)}</td>
        <td>${QUELLE_AUSGABE_LABEL[e.quelle] ?? e.quelle}</td>
        <td class="right">${eur(e.betrag)}</td>
      </tr>`
      )
      .join("") || `<tr><td colspan="4">Keine nicht eingeplanten Kosten im gewählten Zeitraum.</td></tr>`;

  const nichtEingeplantSumme = nichtEingeplant.eintraege.length
    ? `<tr><td colspan="3">Summe nicht eingeplante Kosten</td><td class="right">${eur(nichtEingeplant.summe)}</td></tr>`
    : "";

  const zeitraumLabel = `${von.toLocaleDateString("de-DE")} – ${bis.toLocaleDateString("de-DE")}`;

  return renderHtmlTemplateToPdf(
    readFileSync(TEMPLATE_PATH, "utf-8"),
    {
      untertitel: `Budgetjahr ${jahr} · Zeitraum nicht eingeplanter Kosten: ${zeitraumLabel} · Erstellt am ${now.toLocaleDateString("de-DE")}`,
      summe_budget: eur(dashboard.summeBudget),
      summe_verbraucht: eur(dashboard.summeVerbraucht),
      summe_nicht_eingeplant: eur(nichtEingeplant.summe),
      hinweis_text:
        "Verbrauch = Summe der als ReKo-budgetrelevant markierten Ausgaben je Position im Budgetjahr. " +
        "Nicht eingeplante Kosten = budgetrelevante Ausgaben ohne passende Position. Dieser Bericht ersetzt keine Buchhaltung.",
      footer_text: "Praxis für Systemische Entwicklung · Budgetrechner-Bericht · Seite 1 von 1",
    },
    {
      budget_zeilen: budgetZeilen,
      budget_summe: budgetSumme,
      nicht_eingeplant_zeilen: nichtEingeplantZeilen,
      nicht_eingeplant_summe: nichtEingeplantSumme,
    }
  );
}

export { jahrBounds };
