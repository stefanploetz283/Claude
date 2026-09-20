"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { fuehreMigrationAus, type MigrationErgebnis } from "./actions";

export function MigrationButton({ disabled }: { disabled: boolean }) {
  const [pending, startTransition] = useTransition();
  const [ergebnis, setErgebnis] = useState<MigrationErgebnis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function run() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await fuehreMigrationAus();
        setErgebnis(result);
        router.refresh();
      } catch {
        setError("Migration fehlgeschlagen. Bitte erneut versuchen oder Logs prüfen - nichts wurde halb geschrieben (Transaktion).");
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={run}
        disabled={pending || disabled}
        className="self-start rounded-[var(--radius-control)] bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-white shadow-[var(--shadow-soft)] transition hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
      >
        {pending ? "Migration läuft…" : disabled ? "Bereits vollständig migriert" : "Migration jetzt ausführen"}
      </button>
      {error && <p className="text-sm font-medium text-[var(--color-coral)]">{error}</p>}
      {ergebnis && (
        <div className="rounded-[var(--radius-control)] border border-[var(--color-primary-soft)] bg-[var(--color-primary-soft)] px-4 py-3 text-sm text-[var(--color-primary)]">
          <p className="font-semibold">Migration abgeschlossen.</p>
          <ul className="mt-1.5 flex flex-col gap-0.5">
            <li>{ergebnis.platzhalterAngelegt} Platzhalter-Positionen neu angelegt</li>
            <li>{ergebnis.istKostenEintraegeMigriert} Ist-Kosten-Einträge übernommen</li>
            <li>{ergebnis.budgetAusgabenMigriert} Budget-Ausgaben übernommen</li>
            {ergebnis.uebersprungenDuplikat > 0 && <li>{ergebnis.uebersprungenDuplikat} bereits vorhandene Zeilen übersprungen</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
