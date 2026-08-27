"use client";

import { useActionState } from "react";
import { previewCsvImport, confirmCsvImport, type PreviewState, type ImportState } from "./csv-import-actions";

const inputCls =
  "rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]";
const labelCls = "text-xs font-medium text-[var(--color-text-muted)]";
const cardCls = "rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-soft)]";

const SPALTEN_FELDER: { key: keyof NonNullable<Extract<PreviewState, { headers: string[] }>>["vorschlag"] | string; label: string; required?: boolean }[] = [
  { key: "datumSpalte", label: "Datum", required: true },
  { key: "betragSpalte", label: "Betrag", required: true },
  { key: "empfaengerNameSpalte", label: "Empfänger-Name" },
  { key: "empfaengerIbanSpalte", label: "Empfänger-IBAN" },
  { key: "verwendungszweckSpalte", label: "Verwendungszweck" },
  { key: "finomKategorieSpalte", label: "Finom-Kategorie (falls vorhanden)" },
  { key: "belegSpalte", label: "Beleg-Vermerk (falls vorhanden)" },
];

export function CsvImport() {
  const [previewState, previewAction, previewPending] = useActionState<PreviewState, FormData>(previewCsvImport, undefined);
  const [importState, importAction, importPending] = useActionState<ImportState, FormData>(confirmCsvImport, undefined);
  // Schritt wird direkt aus den Action-Ergebnissen abgeleitet statt separat synchronisiert - vermeidet
  // einen zusätzlichen State, der mit previewState/importState auseinanderlaufen könnte.
  const step: "upload" | "mapping" | "done" = importState?.summary ? "done" : previewState && "headers" in previewState ? "mapping" : "upload";

  function reset() {
    window.location.reload();
  }

  return (
    <div className={cardCls}>
      <h2 className="mb-1 text-sm font-semibold text-[var(--color-text)]">Finom-CSV-Import</h2>
      <p className="mb-3 text-sm text-[var(--color-text-muted)]">
        Monatlicher Import des Finom-Kontoauszugs/Buchhaltungsexports — Spaltenzuordnung wird gespeichert und beim nächsten Import vorbefüllt.
      </p>

      {step === "upload" && (
        <form action={previewAction} className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1">
            <span className={labelCls}>CSV-Datei</span>
            <input name="csv" type="file" accept=".csv" required className="text-sm" />
          </label>
          <button
            type="submit"
            disabled={previewPending}
            className="rounded-[var(--radius-control)] bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
          >
            {previewPending ? "Lese Datei…" : "Datei einlesen"}
          </button>
          {previewState && "error" in previewState && <p className="w-full text-sm text-[var(--color-coral)]">{previewState.error}</p>}
        </form>
      )}

      {step === "mapping" && previewState && "headers" in previewState && (
        <form action={importAction} className="flex flex-col gap-3">
          <input type="hidden" name="csvText" value={previewState.csvText} />
          <p className="text-xs text-[var(--color-text-muted)]">
            {previewState.previewRows.length} Beispielzeile(n) erkannt. Bitte Spalten zuordnen (Vorschlag ist vorausgefüllt):
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {SPALTEN_FELDER.map((f) => {
              const gespeichert = previewState.gespeicherteZuordnung?.[f.key as keyof NonNullable<typeof previewState.gespeicherteZuordnung>];
              const vorschlag = previewState.vorschlag[f.key as keyof typeof previewState.vorschlag];
              const defaultValue = (gespeichert && previewState.headers.includes(gespeichert)) ? gespeichert : (vorschlag ?? "");
              return (
                <label key={f.key} className="flex flex-col gap-1">
                  <span className={labelCls}>
                    {f.label}
                    {f.required ? " *" : " (optional)"}
                  </span>
                  <select name={f.key} defaultValue={defaultValue} required={f.required} className={inputCls}>
                    <option value="">– keine –</option>
                    {previewState.headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </label>
              );
            })}
          </div>

          <div className="overflow-x-auto rounded-[var(--radius-control)] border border-[var(--color-border)]">
            <table className="w-full text-left text-xs">
              <thead className="bg-[var(--color-bg)]">
                <tr>
                  {previewState.headers.map((h) => (
                    <th key={h} className="px-2.5 py-1.5 font-semibold text-[var(--color-text-muted)]">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewState.previewRows.map((row, i) => (
                  <tr key={i} className="border-t border-[var(--color-border)]">
                    {row.map((cell, j) => (
                      <td key={j} className="px-2.5 py-1.5 text-[var(--color-text)]">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={importPending}
              className="rounded-[var(--radius-control)] bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
            >
              {importPending ? "Importiere…" : "Import bestätigen"}
            </button>
            <button type="button" onClick={reset} className="text-sm font-medium text-[var(--color-text-muted)] hover:underline">
              Abbrechen
            </button>
          </div>
          {importState?.error && <p className="text-sm text-[var(--color-coral)]">{importState.error}</p>}
        </form>
      )}

      {step === "done" && importState?.summary && (
        <div className="flex flex-col gap-2">
          <p className="rounded-[var(--radius-control)] bg-[var(--color-primary-soft)] px-3.5 py-3 text-sm text-[var(--color-primary)]">
            {importState.summary.neu} neue Buchung(en) importiert, davon {importState.summary.automatischZugeordnet} automatisch zugeordnet,{" "}
            {importState.summary.zuKlaeren} auf der „Bitte zuordnen&quot;-Liste
            {importState.summary.ignoriert > 0 && `, ${importState.summary.ignoriert} ignoriert (Gehalt/private Entnahme)`}.
            {importState.summary.duplikate > 0 && ` ${importState.summary.duplikate} Duplikate übersprungen.`}
            {importState.summary.uebersprungenUnlesbar > 0 && ` ${importState.summary.uebersprungenUnlesbar} Zeile(n) unlesbar übersprungen.`}
          </p>
          <button onClick={reset} className="self-start text-sm font-medium text-[var(--color-primary)] hover:underline">
            Weiteren Import starten
          </button>
        </div>
      )}
    </div>
  );
}
