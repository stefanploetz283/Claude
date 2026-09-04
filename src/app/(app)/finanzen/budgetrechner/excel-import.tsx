"use client";

import { useActionState } from "react";
import { previewExcelImport, confirmExcelImport, type ExcelPreviewState, type ExcelImportState } from "./excel-import-actions";

const inputCls =
  "rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]";
const cardCls = "rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-soft)]";

function eur(n: number) {
  return n.toLocaleString("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 2 });
}

export function ExcelImport({ jahr }: { jahr: number }) {
  const [previewState, previewAction, previewPending] = useActionState<ExcelPreviewState, FormData>(previewExcelImport, undefined);
  const [importState, importAction, importPending] = useActionState<ExcelImportState, FormData>(confirmExcelImport, undefined);

  const step: "upload" | "review" | "done" =
    importState && (importState.angelegt != null || importState.aktualisiert != null) ? "done" : previewState && "bloecke" in previewState ? "review" : "upload";

  function reset() {
    window.location.reload();
  }

  // Start-Index je Block im flachen Formular-Feld – muss zur Reihenfolge in confirmExcelImport (getAll) passen.
  const bloecke = previewState && "bloecke" in previewState ? previewState.bloecke : [];
  const blockStartIdx: number[] = [];
  bloecke.reduce((acc, b, i) => {
    blockStartIdx[i] = acc;
    return acc + b.positionen.length;
  }, 0);

  return (
    <div className={cardCls}>
      <h2 className="text-sm font-semibold text-[var(--color-text)]">Entgeltkalkulation importieren (.xlsx)</h2>
      <p className="mt-1 text-sm text-[var(--color-text-muted)]">
        Liest die Einzelpositionen der Blöcke Raumkosten, Verwaltungssachkosten und Sonstige Kosten und AfA aus dem Blatt
        „Weitere Betriebskosten + AfA&quot;. Jede Zeile wird eine eigene Budget-Position – die Zwischensummen dienen nur als Prüfsumme.
      </p>

      {step === "upload" && (
        <form action={previewAction} className="mt-3 flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-[var(--color-text-muted)]">Budgetjahr</span>
            <input name="jahr" type="number" min="2000" max="2100" defaultValue={jahr} className={inputCls} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-[var(--color-text-muted)]">Datei</span>
            <input name="datei" type="file" accept=".xlsx" required className="text-sm" />
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

      {step === "review" && previewState && "bloecke" in previewState && (
        <form action={importAction} className="mt-4 flex flex-col gap-4">
          <input type="hidden" name="jahr" value={previewState.jahr} />

          {previewState.warnungen.map((w, i) => (
            <p key={i} className="rounded-[var(--radius-control)] border border-[var(--color-gold)] bg-[var(--color-gold-soft)] px-3 py-2 text-xs text-[#8A5A12]">
              {w}
            </p>
          ))}

          {previewState.bloecke.length === 0 ? (
            <button type="button" onClick={reset} className="self-start text-sm font-medium text-[var(--color-primary)] hover:underline">
              Andere Datei wählen
            </button>
          ) : (
            <>
              <p className="text-xs text-[var(--color-text-muted)]">
                Blatt „{previewState.blattName}&quot; · Budgetjahr {previewState.jahr}. Name/Betrag je Position bei Bedarf korrigieren,
                Haken entfernen um eine Zeile zu überspringen. Vorhandene Positionen mit gleichem Namen werden aktualisiert.
              </p>

              {previewState.bloecke.map((block, bi) => {
                const abw = block.abweichung;
                const abwOk = abw == null || Math.abs(abw) <= 0.02;
                return (
                  <div key={block.blockName} className="overflow-x-auto rounded-[var(--radius-control)] border border-[var(--color-border)]">
                    <div className="flex flex-wrap items-baseline justify-between gap-2 bg-[var(--color-bg)] px-3 py-2">
                      <span className="text-sm font-semibold text-[var(--color-text)]">{block.blockName}</span>
                      <span className={`text-xs ${abwOk ? "text-[var(--color-text-muted)]" : "font-semibold text-[var(--color-coral)]"}`}>
                        Summe Einzelposten {eur(block.summeEinzelposten)}
                        {block.zwischensumme != null && <> · Zwischensumme lt. Excel {eur(block.zwischensumme)}</>}
                        {abw != null && Math.abs(abw) > 0.005 && <> · Abweichung {eur(abw)}</>}
                        {abwOk && block.zwischensumme != null && " ✓"}
                      </span>
                    </div>
                    <table className="w-full text-left text-sm">
                      <thead className="text-xs font-semibold text-[var(--color-text-muted)] uppercase">
                        <tr>
                          <th className="px-2.5 py-2">Import</th>
                          <th className="px-2.5 py-2">Zeile</th>
                          <th className="px-2.5 py-2">Name</th>
                          <th className="px-2.5 py-2">Jahresbetrag (€)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {block.positionen.map((p, pi) => {
                          const idx = blockStartIdx[bi] + pi;
                          return (
                            <tr key={idx} className="border-t border-[var(--color-border)]">
                              <td className="px-2.5 py-1.5">
                                <input type="checkbox" name="uebernehmen" value={idx} defaultChecked />
                              </td>
                              <td className="px-2.5 py-1.5 text-xs text-[var(--color-text-muted)]">{p.zeile}</td>
                              <td className="px-2.5 py-1.5">
                                <input name="name" defaultValue={p.name} className={`w-full ${inputCls}`} />
                              </td>
                              <td className="px-2.5 py-1.5">
                                <input name="betrag" type="number" min="0" step="0.01" defaultValue={p.jahresbetrag} className={`w-36 ${inputCls}`} />
                              </td>
                            </tr>
                          );
                        })}
                        {block.positionen.length === 0 && (
                          <tr className="border-t border-[var(--color-border)]">
                            <td colSpan={4} className="px-2.5 py-2 text-xs text-[var(--color-text-muted)]">
                              Keine Einzelpositionen erkannt.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                );
              })}

              <label className="flex items-center gap-2 text-sm text-[var(--color-text)]">
                <input type="checkbox" name="ersetzen" defaultChecked />
                Vorhandene importierte Positionen für {previewState.jahr} ersetzen
                {previewState.vorhandeneImportPositionen > 0 && (
                  <span className="text-[var(--color-text-muted)]">
                    ({previewState.vorhandeneImportPositionen} vorhanden – nicht mehr enthaltene werden gelöscht, deren Ausgaben wandern in „nicht eingeplant&quot;)
                  </span>
                )}
              </label>

              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={importPending}
                  className="rounded-[var(--radius-control)] bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
                >
                  {importPending ? "Speichere…" : "Positionen übernehmen"}
                </button>
                <button type="button" onClick={reset} className="text-sm font-medium text-[var(--color-text-muted)] hover:underline">
                  Abbrechen
                </button>
              </div>
            </>
          )}
          {importState?.error && <p className="text-sm text-[var(--color-coral)]">{importState.error}</p>}
        </form>
      )}

      {step === "done" && importState && (
        <div className="mt-3 flex flex-col gap-2">
          <p className="rounded-[var(--radius-control)] bg-[var(--color-primary-soft)] px-3.5 py-3 text-sm text-[var(--color-primary)]">
            {importState.angelegt ?? 0} Position(en) neu angelegt, {importState.aktualisiert ?? 0} aktualisiert
            {importState.ersetzt ? `, ${importState.ersetzt} entfernt (nicht mehr in der Kalkulation)` : ""} (Budgetjahr {importState.jahr}).
          </p>
          <button onClick={reset} className="self-start text-sm font-medium text-[var(--color-primary)] hover:underline">
            Weiteren Import starten
          </button>
        </div>
      )}
    </div>
  );
}
