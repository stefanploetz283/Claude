"use client";

import { useActionState } from "react";
import { buchenAdHoc, type BuchungActionState } from "../../../calendar/buchung-actions";
import { TERMINART_OPTIONS } from "@/lib/termine/labels";
import { inputCls, buttonPrimaryCls } from "@/app/(app)/cases/case-ui";
import { IconPlus } from "@/components/pros/pros-icons";


/** Schnelle Fall-Termin-Buchung direkt aus der Fallakte - immer Kategorie FALL_TERMIN, freie Ad-hoc-Zeit
 * (kein Slot-Bezug). Für Raum-Zuweisung/Slot-Buchung siehe der volle Terminkalender. */
export function CaseAppointmentForm({ caseId, employeeId, defaultDate }: { caseId: string; employeeId: string; defaultDate: string }) {
  const [state, formAction, pending] = useActionState<BuchungActionState, FormData>(buchenAdHoc, undefined);

  return (
    <form
      action={formAction}
      className="flex flex-wrap items-end gap-4 rounded-[var(--pros-r-md)] border border-[var(--pros-border-strong)] bg-[var(--color-surface)] p-5 shadow-[var(--pros-shadow)]"
    >
      <input type="hidden" name="caseId" value={caseId} />
      <input type="hidden" name="employeeId" value={employeeId} />
      <input type="hidden" name="kategorie" value="FALL_TERMIN" />
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-[var(--color-text-muted)]">Terminart</span>
        <select name="terminArt" required className={inputCls}>
          <option value="">Bitte wählen…</option>
          {TERMINART_OPTIONS.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-[var(--color-text-muted)]">Datum</span>
        <input name="date" type="date" required defaultValue={defaultDate} className={inputCls} />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-[var(--color-text-muted)]">Von</span>
        <input name="startTime" type="time" required className={inputCls} />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-[var(--color-text-muted)]">Bis</span>
        <input name="endTime" type="time" required className={inputCls} />
      </label>
      <label className="flex flex-1 min-w-[12rem] flex-col gap-1.5">
        <span className="text-xs font-medium text-[var(--color-text-muted)]">Notiz (optional)</span>
        <input name="note" className={inputCls} />
      </label>
      <button
        type="submit"
        disabled={pending}
        className={`${buttonPrimaryCls} inline-flex items-center gap-2`}
      >
        {pending ? "Speichern…" : (
          <>
            <IconPlus size={16} />
            Termin anlegen
          </>
        )}
      </button>
      {state?.error && <p className="w-full text-sm text-[var(--pros-status-critical-text)]">{state.error}</p>}
      {state?.konflikte && state.konflikte.length > 0 && (
        <p className="w-full text-sm text-[var(--pros-status-critical-text)]">
          Terminkonflikt mit {state.konflikte.length} bestehendem Termin – bitte im vollen Kalender (mit Übersteuerungs-Option) buchen.
        </p>
      )}
    </form>
  );
}
