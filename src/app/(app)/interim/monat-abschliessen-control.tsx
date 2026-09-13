"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { getMonatsZusammenfassung, schliesseMonatAb, oeffneMonatWieder } from "./actions";

/** Wiederverwendet auf dem Interims-Dashboard und auf der Export-Seite eines Falls (Prompt Punkt 1:
 * "sichtbar auf der Interimsmodus-Dashboard-/Exportseite"). */
export function MonatAbschliessenControl({ jahr, monat, label }: { jahr: number; monat: number; label: string }) {
  const router = useRouter();
  const [zusammenfassung, setZusammenfassung] = useState<{ anzahlEintraege: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleAnfordern() {
    setError(null);
    startTransition(async () => {
      setZusammenfassung(await getMonatsZusammenfassung(jahr, monat));
    });
  }

  function handleBestaetigen() {
    startTransition(async () => {
      const result = await schliesseMonatAb(jahr, monat);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setZusammenfassung(null);
      router.refresh();
    });
  }

  if (zusammenfassung) {
    return (
      <div className="rounded-[var(--radius-control)] bg-[var(--color-warn-soft)] p-3.5">
        <p className="mb-2 text-sm text-[var(--color-warn-text)]">
          <strong>{label}</strong> abschließen? {zusammenfassung.anzahlEintraege} dokumentierte{" "}
          {zusammenfassung.anzahlEintraege === 1 ? "Eintrag" : "Einträge"}. Der Monat wird danach primär read-only, bis er wieder
          geöffnet wird.
        </p>
        <div className="flex items-center gap-2.5">
          <button
            disabled={pending}
            onClick={handleBestaetigen}
            className="rounded-[var(--radius-control)] bg-[var(--color-coral)] px-3.5 py-1.5 text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {pending ? "Wird abgeschlossen…" : "Ja, Monat abschließen"}
          </button>
          <button onClick={() => setZusammenfassung(null)} className="text-xs font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
            Abbrechen
          </button>
        </div>
        {error && <p className="mt-2 text-xs text-[var(--color-coral)]">{error}</p>}
      </div>
    );
  }

  return (
    <div>
      <button
        disabled={pending}
        onClick={handleAnfordern}
        className="rounded-[var(--radius-control)] border border-[var(--color-primary)] px-3.5 py-1.5 text-xs font-semibold text-[var(--color-primary)] transition hover:bg-[var(--color-primary)] hover:text-white disabled:opacity-50"
      >
        {pending ? "…" : `${label} abschließen`}
      </button>
      {error && <p className="mt-2 text-xs text-[var(--color-coral)]">{error}</p>}
    </div>
  );
}

/** Nur für Admin sichtbar - der gesamte Interimsmodus ist ohnehin admin-only (requireInterimAdmin), es
 * gibt hier keine separate Fachkraft-Rolle, die ausgeschlossen werden müsste. */
export function MonatWiederOeffnenButton({ jahr, monat, label }: { jahr: number; monat: number; label: string }) {
  const router = useRouter();
  const [bestaetigen, setBestaetigen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleBestaetigen() {
    startTransition(async () => {
      const result = await oeffneMonatWieder(jahr, monat);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setBestaetigen(false);
      router.refresh();
    });
  }

  if (bestaetigen) {
    return (
      <div className="rounded-[var(--radius-control)] bg-[var(--color-warn-soft)] p-3">
        <p className="mb-2 text-xs text-[var(--color-warn-text)]">
          <strong>{label}</strong> wieder öffnen? Der Monat wird wieder editierbar, Dashboard-Kontingente können sich ändern.
        </p>
        <div className="flex items-center gap-2.5">
          <button
            disabled={pending}
            onClick={handleBestaetigen}
            className="rounded-[var(--radius-control)] bg-[var(--color-coral)] px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {pending ? "Wird geöffnet…" : "Ja, wieder öffnen"}
          </button>
          <button onClick={() => setBestaetigen(false)} className="text-xs font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
            Abbrechen
          </button>
        </div>
        {error && <p className="mt-2 text-xs text-[var(--color-coral)]">{error}</p>}
      </div>
    );
  }

  return (
    <button onClick={() => setBestaetigen(true)} className="text-xs font-medium text-[var(--color-primary)] hover:underline">
      Wieder öffnen
    </button>
  );
}
