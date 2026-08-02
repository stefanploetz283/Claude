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
  clientAddress: string | null;
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

function formatHM(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return `${h}:${String(m).padStart(2, "0")}`;
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

/** Baut den HTML-Abschnitt für einen einzelnen Fall (Klientendaten, Tabelle, Prozess, Summe/Unterschrift). */
export function renderCaseSectionHtml(params: {
  caseInfo: CaseForExport;
  entries: ServiceEntryForExport[];
  monthLabel: string;
  processNote: string | null;
  practice: PracticeForExport;
}): string {
  const { caseInfo, entries, monthLabel, processNote, practice } = params;

  const rows = entries
    .map(
      (e) => `
      <tr>
        <td>${format(e.date, "dd.MM.yyyy")}</td>
        <td>${format(e.startTime, "HH:mm")} – ${format(e.endTime, "HH:mm")}</td>
        <td>${formatHM(e.durationMinutes)}</td>
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
    <div class="sub">PROS</div>

    <div class="cards">
      <div class="card">
        <b>Klient</b>
        <div class="row"><span>Vorname</span>${escapeHtml(caseInfo.clientFirstName)}</div>
        <div class="row"><span>Nachname</span>${escapeHtml(caseInfo.clientLastName)}</div>
        <div class="row"><span>Adresse</span>${escapeHtml(caseInfo.clientAddress ?? "")}</div>
      </div>
    </div>

    <div class="infoboxes">
      <div class="infobox"><div class="l">ASD</div><div class="v">${escapeHtml(caseInfo.authority)}</div></div>
      <div class="infobox"><div class="l">Fachkraft</div><div class="v">${escapeHtml(caseInfo.assignedEmployeeName)}</div></div>
      <div class="infobox"><div class="l">Monat</div><div class="v">${escapeHtml(monthLabel)}</div></div>
    </div>

    <table>
      <thead><tr><td>DATUM</td><td>ZEIT</td><td>DAUER</td><td>INHALT / TÄTIGKEIT</td></tr></thead>
      <tbody>${rows || emptyRow}</tbody>
    </table>

    <div class="prozess">
      <b>Prozess</b>
      ${processNote ? `<div class="text">${escapeHtml(processNote)}</div>` : ""}
    </div>

    <div class="tail">
      <div class="sumbox">
        <div class="l">Gesamtstunden</div>
        <div class="v">${formatHM(totalMinutes)}</div>
      </div>
      <div class="signbox">
        <div class="l">Unterschrift Fachkraft</div>
        <div class="signline">Ort, Datum</div>
        <div class="signline">&nbsp;</div>
      </div>
    </div>
  </div>`;
}

export async function buildCaseServicePdf(params: {
  caseInfo: CaseForExport;
  entries: ServiceEntryForExport[];
  periodLabel: string;
  monthLabel: string;
  processNote: string | null;
  practice: PracticeForExport;
}): Promise<Buffer> {
  const templateHtml = readFileSync(TEMPLATE_PATH, "utf-8");
  return renderHtmlTemplateToPdf(templateHtml, {}, { sections: renderCaseSectionHtml(params) });
}
