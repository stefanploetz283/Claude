"use client";

import { useActionState } from "react";
import {
  previewBudgetCsv,
  analyseBudgetCsvAction,
  confirmBudgetCsv,
  type CsvPreviewState,
  type CsvAnalyseState,
  type CsvImportState,
} from "./finom-import-actions";

const inputCls =
  "rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]";
const labelCls = "text-xs font-medium text-[var(--color-text-muted)]";
const cardCls = "rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-soft)]";

const SPALTEN_FELDER: { key: string; label: string; required?: boolean }[] = [
  { key: "datumSpalte", label: "Datum", required: true },
  { key: "betragSpalte", label: "Betrag", required: true },
  { key: "empfaengerNameSpalte", label: "Empfänger-Name" },
  { key: "empfaengerIbanSpalte", label: "Empfänger-IBAN" },
  { key: "verwendungszweckSpalte", label: "Verwendungszweck" },
];

function eur(n: number) {
  return n.toLocaleString("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 2 });
}

export function FinomCsvImport() {
  const [previewState, previewAction, previewPending] = useActionState<CsvPreviewState, FormData>(previewBudgetCsv, undefined);
  const [analyseState, analyseAction, analysePending] = useActionState<CsvAnalyseState, FormData>(analyseBudgetCsvAction, undefined);
  const [importState, importAction, importPending] = useActionState<CsvImportState, FormData>(confirmBudgetCsv, undefined);

  const step: "upload" | "mapping" | "review" | "done" =
    importState?.importiert != null
      ? "done"
      : analyseState && "analyse" in analyseState
        ? "review"
        : previewState && "headers" in previewState
          ? "mapping"
          : "upload";

  function reset() {
    window.location.reload();
  }

  return (
    <div className={cardCls}>
      <h2 className="text-sm font-semibold text-[var(--color-text)]">Finom-CSV-Import</h2>
      <p className="mt-1 text-sm text-[var(--color-text-muted)]">
        Monatlicher Import des Finom-Kontoauszugs. Eindeutig zuordenbare Buchungen werden übernommen, der Rest im Prüf-Schritt bestätigt.
        Bereits importierte Buchungen werden automatisch übersprungen.
      </p>

      {step === "upload" && (
        <form action={previewAction} className="mt-3 flex flex-wrap items-end gap-2">
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
        <form action={analyseAction} className="mt-4 flex flex-col gap-3">
          <input type="hidden" name="csvText" value={previewState.csvText} />
          <p className="text-xs text-[var(--color-text-muted)]">{previewState.previewRows.length} Beispielzeile(n) erkannt. Bitte Spalten zuordnen:</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {SPALTEN_FELDER.map((f) => {
              const gespeichert = previewState.gespeicherteZuordnung?.[f.key as keyof NonNullable<typeof previewState.gespeicherteZuordnung>] as string | null | undefined;
              const vorschlag = previewState.vorschlag[f.key as keyof typeof previewState.vorschlag];
              const defaultValue = gespeichert && previewState.headers.includes(gespeichert) ? gespeichert : vorschlag ?? "";
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
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={analysePending}
              className="rounded-[var(--radius-control)] bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
            >
              {analysePending ? "Analysiere…" : "Weiter zur Prüfung"}
            </button>
            <button type="button" onClick={reset} className="text-sm font-medium text-[var(--color-text-muted)] hover:underline">
              Abbrechen
            </button>
          </div>
          {analyseState && "error" in analyseState && <p className="text-sm text-[var(--color-coral)]">{analyseState.error}</p>}
        </form>
      )}

      {step === "review" && analyseState && "analyse" in analyseState && (
        <form action={importAction} className="mt-4 flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-5">
            {[
              ["Zeilen", analyseState.analyse.gesamt],
              ["eindeutig", analyseState.analyse.eindeutig],
              ["zu prüfen", analyseState.analyse.unsicher],
              ["Duplikate", analyseState.analyse.duplikate],
              ["unlesbar", analyseState.analyse.unlesbar],
            ].map(([label, wert]) => (
              <div key={label as string} className="rounded-[var(--radius-control)] bg-[var(--color-bg)] px-2.5 py-2">
                <span className="font-semibold text-[var(--color-text)]">{wert as number}</span> <span className="text-[var(--color-text-muted)]">{label as string}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-[var(--color-text-muted)]">
            Position pro Buchung prüfen. „— keine —&quot; = nicht eingeplante Kosten. Haken bei „Import&quot; entfernen, um eine Buchung zu
            überspringen (z.B. Kontoumbuchung). Duplikate sind ausgeblendet.
          </p>

          <div className="overflow-x-auto rounded-[var(--radius-control)] border border-[var(--color-border)]">
            <table className="w-full text-left text-sm">
              <thead className="bg-[var(--color-bg)] text-xs font-semibold text-[var(--color-text-muted)] uppercase">
                <tr>
                  <th className="px-2.5 py-2">Import</th>
                  <th className="px-2.5 py-2">Datum</th>
                  <th className="px-2.5 py-2">Buchung</th>
                  <th className="px-2.5 py-2 text-right">Betrag</th>
                  <th className="px-2.5 py-2">Position</th>
                  <th className="px-2.5 py-2">ReKo</th>
                </tr>
              </thead>
              <tbody>
                {analyseState.analyse.zeilen
                  .filter((z) => !z.istDuplikat)
                  .map((z, i) => (
                    <tr key={z.dedupKey} className={`border-t border-[var(--color-border)] ${z.eindeutig ? "" : "bg-[var(--color-gold-soft)]"}`}>
                      <td className="px-2.5 py-1.5">
                        <input type="checkbox" name={`uebernehmen:${i}`} defaultChecked />
                        <input type="hidden" name="zeile" value={JSON.stringify({ datum: z.datum, betrag: z.betrag, beschreibung: z.beschreibung, dedupKey: z.dedupKey })} />
                      </td>
                      <td className="px-2.5 py-1.5 whitespace-nowrap text-[var(--color-text-muted)]">{new Date(z.datum).toLocaleDateString("de-DE")}</td>
                      <td className="px-2.5 py-1.5 text-[var(--color-text)]">{z.beschreibung}</td>
                      <td className="px-2.5 py-1.5 text-right font-semibold text-[var(--color-text)]">{eur(z.betrag)}</td>
                      <td className="px-2.5 py-1.5">
                        <select name={`kategorie:${i}`} defaultValue={z.vorschlagKategorieId ?? "__none__"} className={inputCls}>
                          <option value="__none__">— keine —</option>
                          {analyseState.kategorien.map((k) => (
                            <option key={k.id} value={k.id}>
                              {k.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-2.5 py-1.5">
                        <input type="checkbox" name={`reko:${i}`} defaultChecked />
                      </td>
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

      {step === "done" && importState?.importiert != null && (
        <div className="mt-3 flex flex-col gap-2">
          <p className="rounded-[var(--radius-control)] bg-[var(--color-primary-soft)] px-3.5 py-3 text-sm text-[var(--color-primary)]">
            {importState.importiert} Buchung(en) importiert, davon {importState.nichtEingeplant} ohne Position (nicht eingeplant).
            {importState.uebersprungen ? ` ${importState.uebersprungen} übersprungen.` : ""}
            {importState.duplikate ? ` ${importState.duplikate} Duplikate.` : ""}
          </p>
          <button onClick={reset} className="self-start text-sm font-medium text-[var(--color-primary)] hover:underline">
            Weiteren Import starten
          </button>
        </div>
      )}
    </div>
  );
}
