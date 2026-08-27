"use client";

import { useActionState, useMemo, useState, useTransition } from "react";
import { addPrivaterAbzugEintrag, deletePrivaterAbzugEintrag, updatePrivaterAbzugKonfiguration, type ActionState } from "./steuer-actions";

const inputCls =
  "rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]";
const labelCls = "text-xs font-medium text-[var(--color-text-muted)]";
const cardCls = "rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-soft)]";

const KATEGORIEN = [
  { value: "HANDWERKERLEISTUNGEN", label: "Handwerkerleistungen (Arbeitslohn-Anteil)" },
  { value: "HAUSHALTSNAHE_DIENSTLEISTUNGEN", label: "Haushaltsnahe Dienstleistungen" },
  { value: "HAUSHALTSNAHE_BESCHAEFTIGUNG", label: "Haushaltsnahe Beschäftigung" },
  { value: "KINDERBETREUUNG", label: "Kinderbetreuungskosten" },
  { value: "SCHULGELD", label: "Schulgeld" },
  { value: "AUSSERGEWOEHNLICHE_BELASTUNG", label: "Außergewöhnliche Belastungen" },
  { value: "SONSTIGES", label: "Sonstiges" },
];
const KATEGORIE_LABEL: Record<string, string> = Object.fromEntries(KATEGORIEN.map((k) => [k.value, k.label]));

/** Entspricht computeBerechneterAbzug() in src/lib/steuerrechner.ts - hier dupliziert, da steuerrechner.ts
 * über prisma nicht clientseitig gebündelt werden darf (siehe szenario-rechner.tsx für dasselbe Muster). */
function computeBerechneterAbzug(betrag: number, prozentsatz: number | null, deckel: number | null): number | null {
  if (prozentsatz == null || deckel == null) return null;
  return Math.min(betrag * (prozentsatz / 100), deckel);
}

export type PrivaterAbzugKonfigurationRow = { kategorie: string; prozentsatz: number | null; deckelJahr: number | null };
export type PrivaterAbzugEintragRow = { id: string; kategorie: string; eingegebenerBetrag: number; berechneterAbzug: number | null; notiz: string | null };

export function PrivaterAbzugAssistent({
  jahr,
  konfigurationen,
  eintraege,
  summePrivaterAbzuegeJahr,
}: {
  jahr: number;
  konfigurationen: PrivaterAbzugKonfigurationRow[];
  eintraege: PrivaterAbzugEintragRow[];
  summePrivaterAbzuegeJahr: number;
}) {
  const [kategorie, setKategorie] = useState("HANDWERKERLEISTUNGEN");
  const [betrag, setBetrag] = useState("");
  const [state, formAction, pending] = useActionState<ActionState, FormData>(addPrivaterAbzugEintrag, undefined);
  const [konfigOpen, setKonfigOpen] = useState(false);

  const konfig = konfigurationen.find((k) => k.kategorie === kategorie);
  const vorschau = useMemo(() => {
    const b = Number(betrag.replace(",", "."));
    if (!Number.isFinite(b) || b <= 0) return null;
    return computeBerechneterAbzug(b, konfig?.prozentsatz ?? null, konfig?.deckelJahr ?? null);
  }, [betrag, konfig]);

  return (
    <div className={cardCls}>
      <h2 className="mb-1 text-sm font-semibold text-[var(--color-text)]">Privater Steuerabzugs-Assistent ({jahr})</h2>
      <p className="mb-3 text-sm text-[var(--color-text-muted)]">
        Private, außerhalb des Geschäftskontos gezahlte Kosten mit steuerlicher Wirkung — Finoms Steuerprognose kennt diese nicht.
      </p>

      <form action={formAction} className="flex flex-wrap items-end gap-2">
        <input type="hidden" name="jahr" value={jahr} />
        <label className="flex flex-col gap-1">
          <span className={labelCls}>Kategorie</span>
          <select name="kategorie" value={kategorie} onChange={(e) => setKategorie(e.target.value)} className={inputCls}>
            {KATEGORIEN.map((k) => (
              <option key={k.value} value={k.value}>
                {k.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className={labelCls}>Eingegebener Betrag (€)</span>
          <input name="eingegebenerBetrag" type="number" min="0" step="0.01" value={betrag} onChange={(e) => setBetrag(e.target.value)} required className={`w-32 ${inputCls}`} />
        </label>
        <label className="flex min-w-[10rem] flex-1 flex-col gap-1">
          <span className={labelCls}>Notiz (optional)</span>
          <input name="notiz" className={inputCls} />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="rounded-[var(--radius-control)] bg-[var(--color-primary)] px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
        >
          {pending ? "Speichern…" : "Hinzufügen"}
        </button>
      </form>

      <p className="mt-2 text-sm text-[var(--color-text)]">
        {vorschau != null ? (
          <>
            Berechneter Abzug: <span className="font-semibold">{vorschau.toLocaleString("de-DE", { style: "currency", currency: "EUR" })}</span>
          </>
        ) : konfig?.prozentsatz == null ? (
          "Diese Kategorie hat keine feste Formel — individuell zu prüfen, kein Automatik-Abzug."
        ) : (
          "Bitte einen Betrag eingeben."
        )}
      </p>
      {kategorie === "SCHULGELD" && (
        <p className="mt-1 text-xs text-[var(--color-warn-text)]">⚠ Abhängig von Schulart/Anerkennung, mit Steuerberater prüfen.</p>
      )}
      {state?.error && <p className="mt-2 text-sm text-[var(--color-coral)]">{state.error}</p>}

      <div className="mt-4 flex flex-col gap-2 border-t border-[var(--color-border)] pt-3">
        {eintraege.map((e) => (
          <EintragRow key={e.id} eintrag={e} />
        ))}
        {eintraege.length === 0 && <p className="text-sm text-[var(--color-text-muted)]">Noch keine Einträge für {jahr}.</p>}
        <div className="mt-1 flex justify-between border-t border-[var(--color-border)] pt-2 text-sm font-semibold text-[var(--color-text)]">
          <span>Summe (fließt in Steuerrücklage ein)</span>
          <span>{summePrivaterAbzuegeJahr.toLocaleString("de-DE", { style: "currency", currency: "EUR" })}</span>
        </div>
      </div>

      <div className="mt-4 border-t border-[var(--color-border)] pt-3">
        <button onClick={() => setKonfigOpen((o) => !o)} className="text-xs font-medium text-[var(--color-primary)] hover:underline">
          {konfigOpen ? "Prozentsätze/Deckel ausblenden" : "Prozentsätze/Deckel bearbeiten"}
        </button>
        {konfigOpen && (
          <div className="mt-2 flex flex-col gap-2">
            {konfigurationen.map((k) => (
              <KonfigurationRow key={k.kategorie} konfiguration={k} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function EintragRow({ eintrag }: { eintrag: PrivaterAbzugEintragRow }) {
  const [pending, startTransition] = useTransition();
  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <div>
        <span className="text-[var(--color-text)]">{KATEGORIE_LABEL[eintrag.kategorie]}</span>
        {eintrag.notiz && <span className="ml-2 text-xs text-[var(--color-text-muted)]">({eintrag.notiz})</span>}
      </div>
      <div className="flex items-center gap-3">
        <span className="text-[var(--color-text-muted)]">
          {eintrag.eingegebenerBetrag.toLocaleString("de-DE", { style: "currency", currency: "EUR" })} →{" "}
          {eintrag.berechneterAbzug != null ? eintrag.berechneterAbzug.toLocaleString("de-DE", { style: "currency", currency: "EUR" }) : "individuell zu prüfen"}
        </span>
        <button
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await deletePrivaterAbzugEintrag(eintrag.id);
            })
          }
          className="text-xs font-medium text-[var(--color-coral)] hover:underline disabled:opacity-50"
        >
          Löschen
        </button>
      </div>
    </div>
  );
}

function KonfigurationRow({ konfiguration }: { konfiguration: PrivaterAbzugKonfigurationRow }) {
  const [prozentsatz, setProzentsatz] = useState(konfiguration.prozentsatz?.toString() ?? "");
  const [deckel, setDeckel] = useState(konfiguration.deckelJahr?.toString() ?? "");
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className="min-w-[14rem] flex-1 text-[var(--color-text)]">{KATEGORIE_LABEL[konfiguration.kategorie]}</span>
      <input value={prozentsatz} onChange={(e) => setProzentsatz(e.target.value)} placeholder="Prozentsatz %" className={`w-28 ${inputCls}`} />
      <input value={deckel} onChange={(e) => setDeckel(e.target.value)} placeholder="Deckel €/Jahr" className={`w-28 ${inputCls}`} />
      <button
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            await updatePrivaterAbzugKonfiguration(konfiguration.kategorie, prozentsatz, deckel);
          })
        }
        className="rounded-[var(--radius-control)] border border-[var(--color-primary)] px-3 py-1.5 text-xs font-semibold text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white disabled:opacity-50"
      >
        Speichern
      </button>
    </div>
  );
}
