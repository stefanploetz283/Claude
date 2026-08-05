import { readFileSync } from "fs";
import path from "path";
import { renderHtmlTemplateToPdf } from "./html-pdf";
import { computeStundenmodell, type SondertagWithMeta } from "@/lib/stundenmodell";

const TEMPLATE_PATH = path.join(process.cwd(), "src", "lib", "export", "templates", "stundenmodell.html");

const WOCHENTAG_NAMEN = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];

function formatDate(date: Date): string {
  return date.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export async function buildStundenmodellPdf(params: {
  practiceName: string;
  mitarbeiterName: string;
  wochenstunden: number;
  tageProWoche: number;
  eintrittsdatum: Date | null;
  aktuelleFondsBasis: number;
  gueltigAb: Date;
  wochenplan: { day: number; start: string; end: string }[];
  sondertage: SondertagWithMeta[];
}): Promise<Buffer> {
  const { practiceName, mitarbeiterName, wochenstunden, tageProWoche, eintrittsdatum, aktuelleFondsBasis, gueltigAb, wochenplan, sondertage } =
    params;

  const result = computeStundenmodell({
    wochenstunden,
    tageProWoche,
    aktuelleFondsBasis,
    eintrittsdatum,
    betrachtungsjahr: eintrittsdatum?.getUTCFullYear(),
    sondertage,
  });

  const wochenplanRows = wochenplan
    .map((r) => `<tr><td>${WOCHENTAG_NAMEN[r.day - 1]}</td><td>${r.start}</td><td>${r.end}</td></tr>`)
    .join("");

  const sondertagRows =
    sondertage
      .map(
        (s) =>
          `<tr><td>${s.name}</td><td>${formatDate(s.datum)}</td><td>${s.dauerStd.toFixed(2)} Std.</td><td>${
            s.istEchterExtraTag ? "Echter Extra-Tag" : "Verlängerter Normaltag"
          }</td></tr>`
      )
      .join("") || `<tr><td colspan="4">Keine zugeordnet.</td></tr>`;

  const templateHtml = readFileSync(TEMPLATE_PATH, "utf-8");
  return renderHtmlTemplateToPdf(
    templateHtml,
    {
      untertitel: `${practiceName} – Grundlage für die Jahresarbeitszeitkonto-Vereinbarung`,
      mitarbeiter_name: mitarbeiterName,
      wochenstunden_tage: `${wochenstunden.toFixed(1)} Std. / ${tageProWoche} Tage`,
      fonds_basis: `${aktuelleFondsBasis.toFixed(2)}%`,
      std_pro_tag: `${result.stdProTag.toFixed(2)} Std.`,
      fonds_tage: `${result.fondsTageValue.toFixed(2)} Tage`,
      vorarbeit: `${result.vorarbeitTageValue.toFixed(2)} Tage / ${result.vorarbeitStdValue.toFixed(2)} Std.`,
      ueberschuss: `${result.summeUeberschuss.toFixed(2)} Std.`,
      rest: `${result.restStdValue.toFixed(2)} Std. / ${result.restMinProTagValue.toFixed(1)} Min.`,
      gueltig_ab: formatDate(gueltigAb),
      footer_text: `Erstellt am ${formatDate(new Date())} · ${practiceName}`,
    },
    { wochenplan_rows: wochenplanRows, sondertag_rows: sondertagRows }
  );
}
