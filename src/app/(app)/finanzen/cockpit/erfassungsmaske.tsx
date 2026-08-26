"use client";

import { useActionState } from "react";
import { addIstKostenEintrag, addLiquiditaetsEintrag, type ActionState } from "./actions";
import { toDateInputValue } from "@/lib/date";

const inputCls =
  "rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]";
const labelCls = "text-xs font-medium text-[var(--color-text-muted)]";
const KATEGORIEN: { value: string; label: string }[] = [
  { value: "PERSONALKOSTEN", label: "Personalkosten" },
  { value: "RAUMKOSTEN", label: "Raumkosten" },
  { value: "VERWALTUNGSSACHKOSTEN", label: "Verwaltungssachkosten" },
  { value: "SONSTIGE_KOSTEN_AFA", label: "Sonstige Kosten/AfA" },
];

export function Erfassungsmaske() {
  const [kostenState, kostenAction, kostenPending] = useActionState<ActionState, FormData>(addIstKostenEintrag, undefined);
  const [liquiState, liquiAction, liquiPending] = useActionState<ActionState, FormData>(addLiquiditaetsEintrag, undefined);

  return (
    <div className={cardCls}>
      <h2 className="mb-1 text-sm font-semibold text-[var(--color-text)]">Monats-Erfassung</h2>
      <p className="mb-3 text-sm text-[var(--color-text-muted)]">
        Manuelles Nachtragen von Ist-Kosten (für Ausgaben, die nicht über Finom laufen) und der verfügbaren liquiden Mittel.
      </p>

      <form action={kostenAction} className="flex flex-wrap items-end gap-2 border-b border-[var(--color-border)] pb-4">
        <label className="flex flex-col gap-1">
          <span className={labelCls}>Datum</span>
          <input name="datum" type="date" defaultValue={toDateInputValue(new Date())} required className={inputCls} />
        </label>
        <label className="flex flex-col gap-1">
          <span className={labelCls}>Kategorie</span>
          <select name="kategorie" required className={inputCls}>
            {KATEGORIEN.map((k) => (
              <option key={k.value} value={k.value}>
                {k.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className={labelCls}>Unterkategorie (optional)</span>
          <input name="unterkategorie" className={`w-36 ${inputCls}`} />
        </label>
        <label className="flex flex-col gap-1">
          <span className={labelCls}>Betrag (€)</span>
          <input name="betrag" type="number" min="0" step="0.01" required className={`w-28 ${inputCls}`} />
        </label>
        <label className="flex flex-col gap-1">
          <span className={labelCls}>Beleg-Referenz (optional)</span>
          <input name="belegReferenz" className={`w-32 ${inputCls}`} />
        </label>
        <button
          type="submit"
          disabled={kostenPending}
          className="rounded-[var(--radius-control)] bg-[var(--color-primary)] px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
        >
          {kostenPending ? "Speichern…" : "Kosten-Eintrag speichern"}
        </button>
        {kostenState?.error && <p className="w-full text-sm text-[var(--color-coral)]">{kostenState.error}</p>}
        {kostenState?.success && <p className="w-full text-sm text-[var(--color-green-medium)]">{kostenState.success}</p>}
      </form>

      <form action={liquiAction} className="mt-4 flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1">
          <span className={labelCls}>Datum</span>
          <input name="datum" type="date" defaultValue={toDateInputValue(new Date())} required className={inputCls} />
        </label>
        <label className="flex flex-col gap-1">
          <span className={labelCls}>Verfügbare liquide Mittel (€)</span>
          <input name="verfuegbareLiquideMittel" type="number" min="0" step="0.01" required className={`w-40 ${inputCls}`} />
        </label>
        <button
          type="submit"
          disabled={liquiPending}
          className="rounded-[var(--radius-control)] border border-[var(--color-primary)] px-3.5 py-2 text-sm font-semibold text-[var(--color-primary)] transition hover:bg-[var(--color-primary)] hover:text-white disabled:opacity-50"
        >
          {liquiPending ? "Speichern…" : "Liquiditäts-Eintrag speichern"}
        </button>
        {liquiState?.error && <p className="w-full text-sm text-[var(--color-coral)]">{liquiState.error}</p>}
        {liquiState?.success && <p className="w-full text-sm text-[var(--color-green-medium)]">{liquiState.success}</p>}
      </form>
    </div>
  );
}

const cardCls = "rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-soft)]";
