"use client";

import { useState } from "react";

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

  async function handleExport() {
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
          onClick={handleExport}
          disabled={pending}
          className="rounded-[var(--radius-control)] bg-[var(--color-gold)] px-4 py-2.5 text-sm font-semibold text-white shadow-[var(--shadow-soft)] transition hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "Wird erstellt…" : "Als Monatsabrechnung exportieren"}
        </button>
      </div>
      {error && (
        <p className="rounded-[var(--radius-control)] bg-[#FBE4E1] px-3.5 py-2.5 text-sm font-medium text-[#B23B2E]">⚠ {error}</p>
      )}
    </div>
  );
}
