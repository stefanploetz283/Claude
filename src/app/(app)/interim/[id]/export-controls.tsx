"use client";

import { useState } from "react";
import Link from "next/link";
import { pruefeMonatsUeberschneidungen, istMonatBereitsAbgeschlossen, type UeberschneidungsKonflikt } from "../actions";
import { MonatAbschliessenControl } from "../monat-abschliessen-control";
import { inputCls, buttonGoldCls, buttonDangerSolidCls, buttonSecondaryCls, noticeWarnCls } from "../interim-ui";
import { IconWarnTriangle } from "../interim-icons";

const MONTH_NAMES = [
  "Januar", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember",
];

export function ExportControls({ caseId }: { caseId: string }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [konflikte, setKonflikte] = useState<UeberschneidungsKonflikt[] | null>(null);
  const [exportierterMonat, setExportierterMonat] = useState<{ jahr: number; monat: number; label: string } | null>(null);

  async function handleExportClick() {
    setError(null);
    setPending(true);
    try {
      const gefunden = await pruefeMonatsUeberschneidungen(caseId, year, month);
      if (gefunden.length > 0) {
        setKonflikte(gefunden);
        return;
      }
      await downloadExport();
    } finally {
      setPending(false);
    }
  }

  async function downloadExport() {
    setPending(true);
    setError(null);
    setExportierterMonat(null);
    try {
      const res = await fetch(`/api/interim/${caseId}/export?year=${year}&month=${month}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Export fehlgeschlagen." }));
        setError(body.error ?? "Export fehlgeschlagen.");
        return;
      }
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const match = /filename="(.+)"/.exec(disposition);
      const filename = match ? match[1] : "Monatsabrechnung.xlsx";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);

      // "Monat abschließen"-Hinweis nur anbieten, wenn dieser Monat noch nicht abgeschlossen ist - ein
      // erneuter Export eines bereits abgeschlossenen Monats (z.B. für die eigene Ablage) löst keinen
      // erneuten Abschluss-Workflow aus (Prompt Punkt 5).
      const bereitsAbgeschlossen = await istMonatBereitsAbgeschlossen(year, month);
      if (!bereitsAbgeschlossen) {
        setExportierterMonat({ jahr: year, monat: month, label: `${MONTH_NAMES[month - 1]} ${year}` });
      }
    } catch {
      setError("Export fehlgeschlagen. Bitte erneut versuchen.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className={inputCls}>
          {MONTH_NAMES.map((m, i) => (
            <option key={m} value={i + 1}>
              {m}
            </option>
          ))}
        </select>
        <select value={year} onChange={(e) => setYear(Number(e.target.value))} className={inputCls}>
          {Array.from({ length: 4 }, (_, i) => now.getFullYear() - 1 + i).map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
        <button onClick={handleExportClick} disabled={pending} className={buttonGoldCls}>
          {pending ? "Wird geprüft…" : "Als Monatsabrechnung exportieren"}
        </button>
      </div>

      {konflikte && (
        <div className={`dash-card-enter ${noticeWarnCls}`}>
          <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-[var(--pros-status-attention-text)]">
            <IconWarnTriangle /> Für diesen Monat bestehen noch ungeklärte Zeitüberschneidungen
          </p>
          <ul className="mb-3 flex flex-col gap-1 text-sm text-[var(--pros-status-attention-text)]">
            {konflikte.map((k, i) => (
              <li key={i}>
                {k.date}: {k.fallA} ({k.zeitraumA}) ↔ {k.fallB} ({k.zeitraumB}) – {k.ueberlappungMinuten} Min.
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => {
                setKonflikte(null);
                downloadExport();
              }}
              disabled={pending}
              className={buttonDangerSolidCls}
            >
              Trotzdem exportieren
            </button>
            <Link href={`/interim/${caseId}`} className={buttonSecondaryCls}>
              Zur Korrektur springen
            </Link>
            <button onClick={() => setKonflikte(null)} className="text-sm font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
              Abbrechen
            </button>
          </div>
        </div>
      )}

      {exportierterMonat && (
        <MonatAbschliessenControl jahr={exportierterMonat.jahr} monat={exportierterMonat.monat} label={exportierterMonat.label} />
      )}

      {error && (
        <p className="flex items-center gap-1.5 rounded-[var(--pros-r-sm)] bg-[var(--pros-status-critical-bg)] px-3.5 py-2.5 text-sm font-medium text-[var(--pros-status-critical-text)]">
          <IconWarnTriangle /> {error}
        </p>
      )}
    </div>
  );
}
