"use client";

import { useState } from "react";
import Link from "next/link";
import { pruefeMonatsUeberschneidungen, type UeberschneidungsKonflikt } from "../actions";

const MONTH_NAMES = [
  "Januar", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember",
];

const inputCls =
  "rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3.5 py-2.5 text-sm text-[var(--color-text)] outline-none transition focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-soft)]";

export function ExportControls({ caseId }: { caseId: string }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [konflikte, setKonflikte] = useState<UeberschneidungsKonflikt[] | null>(null);

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
        <button
          onClick={handleExportClick}
          disabled={pending}
          className="rounded-[var(--radius-control)] bg-[var(--color-gold)] px-4 py-2.5 text-sm font-semibold text-white shadow-[var(--shadow-soft)] transition hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "Wird geprüft…" : "Als Monatsabrechnung exportieren"}
        </button>
      </div>

      {konflikte && (
        <div className="rounded-[var(--radius-control)] bg-[var(--color-warn-soft)] p-4">
          <p className="mb-2 text-sm font-semibold text-[var(--color-warn-text)]">
            ⚠ Für diesen Monat bestehen noch ungeklärte Zeitüberschneidungen
          </p>
          <ul className="mb-3 flex flex-col gap-1 text-sm text-[var(--color-warn-text)]">
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
              className="rounded-[var(--radius-control)] bg-[var(--color-coral)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
            >
              Trotzdem exportieren
            </button>
            <Link
              href={`/interim/${caseId}`}
              className="rounded-[var(--radius-control)] border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-[var(--color-text)] transition hover:bg-[var(--color-bg)]"
            >
              Zur Korrektur springen
            </Link>
            <button onClick={() => setKonflikte(null)} className="text-sm font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
              Abbrechen
            </button>
          </div>
        </div>
      )}

      {error && (
        <p className="rounded-[var(--radius-control)] bg-[#FBE4E1] px-3.5 py-2.5 text-sm font-medium text-[#B23B2E]">⚠ {error}</p>
      )}
    </div>
  );
}
