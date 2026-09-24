"use client";

import { useActionState } from "react";
import { serieAnlegen, type SerieErgebnis } from "./serie-actions";
import { TERMINART_OPTIONS } from "@/lib/termine/labels";
import type { CaseOption, RaumOption, MitarbeiterinOption } from "./buchungs-formular";
import { inputCls, labelCls, buttonPrimaryCls, buttonSecondaryCls, noticeWarnCls } from "../cases/case-ui";

const fieldCls = `w-full ${inputCls}`;

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
          <div className={`${noticeWarnCls} text-[var(--pros-status-attention-text)]`}>
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
        <button onClick={onDone} className={`self-start ${buttonPrimaryCls}`}>
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
          <select name="employeeId" required defaultValue="" className={fieldCls}>
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
        <select name="caseId" required className={fieldCls}>
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
        <select name="terminArt" required className={fieldCls}>
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
        <input name="terminname" placeholder="z.B. Elterngespräch Trennungssituation" className={fieldCls} />
      </label>

      <div className="flex gap-3">
        <label className="flex flex-1 flex-col gap-1">
          <span className={labelCls}>Erster Termin</span>
          <input name="startDate" type="date" required defaultValue={defaultDate} className={fieldCls} />
        </label>
        <label className="flex flex-1 flex-col gap-1">
          <span className={labelCls}>Von</span>
          <input name="startTime" type="time" required className={fieldCls} />
        </label>
        <label className="flex flex-1 flex-col gap-1">
          <span className={labelCls}>Bis</span>
          <input name="endTime" type="time" required className={fieldCls} />
        </label>
      </div>
      <div className="flex gap-3">
        <label className="flex flex-1 flex-col gap-1">
          <span className={labelCls}>Rhythmus</span>
          <select name="rhythmusTage" defaultValue={14} className={fieldCls}>
            <option value={7}>Wöchentlich</option>
            <option value={14}>Alle 2 Wochen</option>
            <option value={21}>Alle 3 Wochen</option>
            <option value={28}>Alle 4 Wochen</option>
          </select>
        </label>
        <label className="flex flex-1 flex-col gap-1">
          <span className={labelCls}>Bis (Enddatum der Serie)</span>
          <input name="bisDatum" type="date" required className={fieldCls} />
        </label>
      </div>

      <label className="flex flex-col gap-1">
        <span className={labelCls}>Raum (optional)</span>
        <select name="raumId" className={fieldCls}>
          <option value="">Kein Raum</option>
          {raumOptions.map((r) => (
            <option key={r.id} value={r.id}>
              {r.label}
            </option>
          ))}
        </select>
      </label>

      {state && "error" in state && <p className="text-sm text-[var(--pros-status-critical-text)]">{state.error}</p>}

      <div className="flex gap-2">
        <button type="submit" disabled={pending} className={buttonPrimaryCls}>
          {pending ? "Lege an…" : "Serie anlegen"}
        </button>
        <button type="button" onClick={onDone} className={buttonSecondaryCls}>
          Abbrechen
        </button>
      </div>
    </form>
  );
}
