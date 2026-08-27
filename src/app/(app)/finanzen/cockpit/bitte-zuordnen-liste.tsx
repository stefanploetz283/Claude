"use client";

import { useState, useTransition } from "react";
import { assignBuchungManually, ignoreBuchungManually } from "./csv-import-actions";

const KATEGORIEN = [
  { value: "PERSONALKOSTEN", label: "Personalkosten" },
  { value: "RAUMKOSTEN", label: "Raumkosten" },
  { value: "VERWALTUNGSSACHKOSTEN", label: "Verwaltungssachkosten" },
  { value: "SONSTIGE_KOSTEN_AFA", label: "Sonstige Kosten/AfA" },
];

export type ZuKlaerenBuchung = {
  id: string;
  datum: string;
  betrag: number;
  empfaengerName: string | null;
  verwendungszweck: string | null;
};

export function BitteZuordnenListe({ buchungen }: { buchungen: ZuKlaerenBuchung[] }) {
  if (buchungen.length === 0) {
    return (
      <div className={cardCls}>
        <h2 className="text-sm font-semibold text-[var(--color-text)]">Bitte zuordnen</h2>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">Keine unkategorisierten Buchungen offen.</p>
      </div>
    );
  }

  return (
    <div className={cardCls}>
      <h2 className="mb-1 text-sm font-semibold text-[var(--color-text)]">Bitte zuordnen ({buchungen.length})</h2>
      <p className="mb-3 text-sm text-[var(--color-text-muted)]">Buchungen aus dem CSV-Import, die keiner Regel automatisch zugeordnet werden konnten.</p>
      <div className="flex flex-col gap-2">
        {buchungen.map((b) => (
          <BuchungRow key={b.id} buchung={b} />
        ))}
      </div>
    </div>
  );
}

function BuchungRow({ buchung }: { buchung: ZuKlaerenBuchung }) {
  const [kategorie, setKategorie] = useState("");
  const [merken, setMerken] = useState(true);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-[var(--radius-control)] border border-[var(--color-border)] p-2.5 text-sm">
      <div className="min-w-[10rem] flex-1">
        <p className="font-medium text-[var(--color-text)]">{buchung.empfaengerName || buchung.verwendungszweck || "Unbekannt"}</p>
        <p className="text-xs text-[var(--color-text-muted)]">
          {new Date(buchung.datum).toLocaleDateString("de-DE")} ·{" "}
          {buchung.betrag.toLocaleString("de-DE", { style: "currency", currency: "EUR" })}
        </p>
      </div>
      <select value={kategorie} onChange={(e) => setKategorie(e.target.value)} className="rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-bg)] px-2.5 py-1.5 text-sm">
        <option value="">Kategorie wählen…</option>
        {KATEGORIEN.map((k) => (
          <option key={k.value} value={k.value}>
            {k.label}
          </option>
        ))}
      </select>
      <label className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
        <input type="checkbox" checked={merken} onChange={(e) => setMerken(e.target.checked)} />
        als Regel merken
      </label>
      <button
        disabled={pending || !kategorie}
        onClick={() =>
          startTransition(async () => {
            const result = await assignBuchungManually(buchung.id, kategorie, merken);
            setError(result?.error ?? null);
          })
        }
        className="rounded-[var(--radius-control)] border border-[var(--color-primary)] px-3 py-1.5 text-xs font-semibold text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white disabled:opacity-50"
      >
        Zuordnen
      </button>
      <button
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            await ignoreBuchungManually(buchung.id);
          })
        }
        className="text-xs font-medium text-[var(--color-text-muted)] hover:underline disabled:opacity-50"
      >
        Ignorieren
      </button>
      {error && <p className="w-full text-xs text-[var(--color-coral)]">{error}</p>}
    </div>
  );
}

const cardCls = "rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-soft)]";
