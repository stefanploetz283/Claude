import { format } from "date-fns";
import { readFileSync } from "fs";
import path from "path";
import { renderHtmlTemplateToPdf, getLogoDataUri } from "./html-pdf";

export type ServiceEntryForExport = {
  date: Date;
  startTime: Date;
  endTime: Date;
  durationMinutes: number;
  description: string;
  employeeName: string;
};

export type CaseForExport = {
  authority: string; // ASD
  clientFirstName: string;
  clientLastName: string;
  clientStreet: string | null;
  clientPostalCodeCity: string | null;
  helpTypeName: string;
  assignedEmployeeName: string;
};

export type PracticeForExport = {
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  logoBuffer: Buffer | null;
};

const TEMPLATE_PATH = path.join(process.cwd(), "src", "lib", "export", "templates", "leistungsnachweis.html");

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatDecimalHours(minutes: number): string {
  return (minutes / 60).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Erkennt PNG/JPEG-Signaturen für den Data-URI-Mime-Typ; unbekannte Formate fallen auf das Standard-Logo zurück. */
function logoDataUri(practice: PracticeForExport): string {
  const buf = practice.logoBuffer;
  if (buf && buf.length > 4) {
    if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
      return `data:image/png;base64,${buf.toString("base64")}`;
    }
    if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
      return `data:image/jpeg;base64,${buf.toString("base64")}`;
    }
  }
  return getLogoDataUri();
}

/** Baut den HTML-Abschnitt für einen einzelnen Fall (Klienten-/Kursdaten, Tabelle, Unterschrift). */
export function renderCaseSectionHtml(params: {
  caseInfo: CaseForExport;
  entries: ServiceEntryForExport[];
  monthLabel: string;
  practice: PracticeForExport;
}): string {
  const { caseInfo, entries, monthLabel, practice } = params;

  const rows = entries
    .map(
      (e) => `
      <tr>
        <td>${format(e.date, "dd.MM.yyyy")}</td>
        <td>${format(e.startTime, "HH:mm")} – ${format(e.endTime, "HH:mm")}</td>
        <td>${formatDecimalHours(e.durationMinutes)}</td>
        <td>${escapeHtml(e.description)}</td>
      </tr>`
    )
    .join("");

  const emptyRow = `<tr><td colspan="4" style="color:var(--ink-soft);font-style:italic">Keine Einträge in diesem Zeitraum.</td></tr>`;
  const totalMinutes = entries.reduce((sum, e) => sum + e.durationMinutes, 0);

  return `
  <div class="case-section">
    <img class="logo-img" src="${logoDataUri(practice)}" alt="${escapeHtml(practice.name)}">
    <div class="logorule"></div>
    <h1 class="doc">Leistungsnachweis</h1>

    <div class="meta">
      <div class="box">
        <b>Klientendaten</b>
        <span>Vorname</span> ${escapeHtml(caseInfo.clientFirstName)}<br>
        <span>Nachname</span> ${escapeHtml(caseInfo.clientLastName)}<br>
        <span>Strasse</span> ${escapeHtml(caseInfo.clientStreet ?? "")}<br>
        <span>PLZ</span> ${escapeHtml(caseInfo.clientPostalCodeCity ?? "")}
      </div>
      <div class="box">
        <b>Kursdaten</b>
        <span>Monat</span> ${escapeHtml(monthLabel)}<br>
        <span>Kurs</span> ${escapeHtml(caseInfo.helpTypeName)}<br>
        <span>Fachkraft</span> ${escapeHtml(caseInfo.assignedEmployeeName)}<br>
        <span>ASD</span> ${escapeHtml(caseInfo.authority)}
      </div>
    </div>

    <table>
      <thead><tr><td>DATUM</td><td>ZEIT</td><td>STUNDEN</td><td>INHALT</td></tr></thead>
      <tbody>
        ${rows || emptyRow}
        <tr class="sumrow"><td colspan="2">Gesamtstunden im Zeitraum</td><td>${formatDecimalHours(totalMinutes)}</td><td></td></tr>
      </tbody>
    </table>

    <div class="sign">
      <div class="sigcol"><div class="sigline"></div><div class="sigcap">Ort, Datum · Unterschrift Fachkraft</div></div>
    </div>
  </div>`;
}

export async function buildCaseServicePdf(params: {
  caseInfo: CaseForExport;
  entries: ServiceEntryForExport[];
  periodLabel: string;
  monthLabel: string;
  practice: PracticeForExport;
}): Promise<Buffer> {
  const templateHtml = readFileSync(TEMPLATE_PATH, "utf-8");
  return renderHtmlTemplateToPdf(templateHtml, {}, { sections: renderCaseSectionHtml(params) });
}
