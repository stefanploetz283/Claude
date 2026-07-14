"use client";

import { useActionState, useState } from "react";
import { createManualEntry } from "./actions";

type CaseOption = { id: string; label: string };
const inputCls = "rounded-md border border-black/15 px-3 py-1.5 text-sm";

export function ManualEntryForm({ cases }: { cases: CaseOption[] }) {
  const [state, formAction, pending] = useActionState(createManualEntry, undefined);
  const [assignmentType, setAssignmentType] = useState<"case" | "general">("general");
  const [mode, setMode] = useState<"range" | "duration">("range");

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-lg border border-black/10 bg-white p-5">
      <h2 className="text-sm font-semibold text-[var(--color-text)]">Manuelle Erfassung / Korrektur</h2>

      <div className="flex flex-wrap gap-4 text-sm">
        <label className="flex items-center gap-1">
          <input type="radio" checked={assignmentType === "general"} onChange={() => setAssignmentType("general")} />
          Allgemeine Tätigkeit
        </label>
        <label className="flex items-center gap-1">
          <input type="radio" checked={assignmentType === "case"} onChange={() => setAssignmentType("case")} />
          Fall
        </label>
        <input type="hidden" name="assignmentType" value={assignmentType} />
      </div>

      {assignmentType === "general" ? (
        <select name="generalActivity" className={inputCls}>
          <option value="VERWALTUNG">Verwaltung</option>
          <option value="FAHRZEITEN">Fahrzeiten</option>
          <option value="SONSTIGES">Sonstiges</option>
        </select>
      ) : (
        <select name="caseId" className={inputCls}>
          {cases.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      )}

      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-black/60">Datum</span>
          <input name="date" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} className={inputCls} />
        </label>

        <div className="flex gap-3 text-sm">
          <label className="flex items-center gap-1">
            <input type="radio" checked={mode === "range"} onChange={() => setMode("range")} /> Von/Bis
          </label>
          <label className="flex items-center gap-1">
            <input type="radio" checked={mode === "duration"} onChange={() => setMode("duration")} /> Direkte Stundenzahl (+/-)
          </label>
        </div>

        {mode === "range" ? (
          <>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-black/60">Von</span>
              <input name="startTime" type="time" className={inputCls} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-black/60">Bis</span>
              <input name="endTime" type="time" className={inputCls} />
            </label>
          </>
        ) : (
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-black/60">Stunden (z.B. -0.5 für Korrektur)</span>
            <input name="durationHours" type="text" placeholder="1.5" className={inputCls} />
          </label>
        )}

        <label className="flex flex-1 flex-col gap-1">
          <span className="text-xs font-medium text-black/60">Notiz (optional)</span>
          <input name="note" className={inputCls} />
        </label>
      </div>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-[var(--color-primary)] px-5 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "Speichern…" : "Eintragen"}
        </button>
      </div>
    </form>
  );
}
