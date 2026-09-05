"use client";

import { useActionState } from "react";
import { serieAnlegen, type SerieErgebnis } from "./serie-actions";
import { TERMINART_OPTIONS } from "@/lib/termine/labels";
import type { CaseOption, RaumOption, MitarbeiterinOption } from "./buchungs-formular";

const inputCls =
  "w-full rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]";
const labelCls = "text-xs font-medium text-[var(--color-text-muted)]";

/** Serientermine sind laut Vorgabe auf Fall-Termine beschränkt ("jeden zweiten Donnerstag" etc.). Jede
 * Occurrence durchläuft dieselbe Konfliktprüfung wie eine Einzelbuchung; Konflikte werden übersprungen
 * und nach dem Anlegen einzeln aufgelistet, statt die ganze Serie abzubrechen. */
export function SerieFormular({
  defaultDate,
  currentUserId,
  mitarbeiterinnen,
  canBookForOthers,
  caseOptions,
  raumOptions,
  onDone,
}: {
  defaultDate: string;
  currentUserId: string;
  mitarbeiterinnen: MitarbeiterinOption[];
  canBookForOthers: boolean;
  caseOptions: CaseOption[];
  raumOptions: RaumOption[];
  onDone: () => void;
}) {
  const [state, formAction, pending] = useActionState<SerieErgebnis | undefined, FormData>(serieAnlegen, undefined);
  const ergebnis = state && "angelegt" in state ? state : null;

  if (ergebnis) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm font-medium text-[var(--color-primary)]">{ergebnis.angelegt} Termin(e) angelegt.</p>
        {ergebnis.uebersprungen.length > 0 && (
          <div className="rounded-[var(--radius-control)] bg-[var(--color-warn-soft)] p-3 text-sm text-[var(--color-warn-text)]">
            <p className="mb-1 font-semibold">{ergebnis.uebersprungen.length} übersprungen:</p>
            <ul className="flex flex-col gap-0.5">
              {ergebnis.uebersprungen.map((u, i) => (
                <li key={i}>
                  {u.datum}: {u.grund}
                </li>
              ))}
            </ul>
          </div>
        )}
        <button onClick={onDone} className="self-start rounded-[var(--radius-control)] bg-[var(--color-primary)] px-5 py-2.5 text-sm font-semibold text-white">
          Schließen
        </button>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-3">
      {canBookForOthers ? (
        <label className="flex flex-col gap-1">
          <span className={labelCls}>Mitarbeiterin</span>
          <select name="employeeId" required defaultValue="" className={inputCls}>
            <option value="">Bitte wählen…</option>
            {mitarbeiterinnen.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <input type="hidden" name="employeeId" value={currentUserId} />
      )}

      <label className="flex flex-col gap-1">
        <span className={labelCls}>Fall</span>
        <select name="caseId" required className={inputCls}>
          <option value="">Bitte wählen…</option>
          {caseOptions.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className={labelCls}>Terminart</span>
        <select name="terminArt" required className={inputCls}>
          <option value="">Bitte wählen…</option>
          {TERMINART_OPTIONS.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className={labelCls}>Terminname (optional)</span>
        <input name="terminname" placeholder="z.B. Elterngespräch Trennungssituation" className={inputCls} />
      </label>

      <div className="flex gap-3">
        <label className="flex flex-1 flex-col gap-1">
          <span className={labelCls}>Erster Termin</span>
          <input name="startDate" type="date" required defaultValue={defaultDate} className={inputCls} />
        </label>
        <label className="flex flex-1 flex-col gap-1">
          <span className={labelCls}>Von</span>
          <input name="startTime" type="time" required className={inputCls} />
        </label>
        <label className="flex flex-1 flex-col gap-1">
          <span className={labelCls}>Bis</span>
          <input name="endTime" type="time" required className={inputCls} />
        </label>
      </div>
      <div className="flex gap-3">
        <label className="flex flex-1 flex-col gap-1">
          <span className={labelCls}>Rhythmus</span>
          <select name="rhythmusTage" defaultValue={14} className={inputCls}>
            <option value={7}>Wöchentlich</option>
            <option value={14}>Alle 2 Wochen</option>
            <option value={21}>Alle 3 Wochen</option>
            <option value={28}>Alle 4 Wochen</option>
          </select>
        </label>
        <label className="flex flex-1 flex-col gap-1">
          <span className={labelCls}>Bis (Enddatum der Serie)</span>
          <input name="bisDatum" type="date" required className={inputCls} />
        </label>
      </div>

      <label className="flex flex-col gap-1">
        <span className={labelCls}>Raum (optional)</span>
        <select name="raumId" className={inputCls}>
          <option value="">Kein Raum</option>
          {raumOptions.map((r) => (
            <option key={r.id} value={r.id}>
              {r.label}
            </option>
          ))}
        </select>
      </label>

      {state && "error" in state && <p className="text-sm text-[var(--color-coral)]">{state.error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-[var(--radius-control)] bg-[var(--color-primary)] px-5 py-2.5 text-sm font-semibold text-white shadow-[var(--shadow-soft)] transition hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
        >
          {pending ? "Lege an…" : "Serie anlegen"}
        </button>
        <button type="button" onClick={onDone} className="rounded-[var(--radius-control)] border border-[var(--color-border)] px-5 py-2.5 text-sm font-medium text-[var(--color-text)]">
          Abbrechen
        </button>
      </div>
    </form>
  );
}
