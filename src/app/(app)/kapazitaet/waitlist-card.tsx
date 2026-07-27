"use client";

import { useActionState, useState, useTransition } from "react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { cancelWaitlistEntry, convertWaitlistEntry, type ConvertActionState } from "./actions";
import { toDateInputValue } from "@/lib/date";

const inputCls =
  "rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-1.5 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]";

export type Suggestion = { employeeId: string; employeeName: string; fromWeek: Date; toWeek: Date } | null;

export function WaitlistCard({
  entry,
  suggestion,
  employees,
  defaultTotalHours,
  defaultDurationWeeks,
  defaultPhaseOutWeeks,
}: {
  entry: {
    id: string;
    clientName: string;
    authority: string | null;
    helpTypeName: string;
    requestedAt: Date;
    urgencyNote: string | null;
    waitingDays: number;
  };
  suggestion: Suggestion;
  employees: { id: string; name: string }[];
  defaultTotalHours: number | null;
  defaultDurationWeeks: number | null;
  defaultPhaseOutWeeks: number;
}) {
  const [open, setOpen] = useState(false);
  const [cancelPending, startCancel] = useTransition();

  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-soft)]">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-[var(--color-text)]">{entry.clientName}</p>
          <p className="text-xs text-[var(--color-text-muted)]">
            {entry.helpTypeName}
            {entry.authority ? ` · ${entry.authority}` : ""}
          </p>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">
            Wartet seit {format(entry.requestedAt, "dd.MM.yyyy", { locale: de })} ({entry.waitingDays} Tage)
            {entry.urgencyNote ? ` · ${entry.urgencyNote}` : ""}
          </p>
        </div>
        <button
          disabled={cancelPending}
          onClick={() => {
            if (confirm("Diese Anfrage von der Warteliste nehmen?")) startCancel(() => cancelWaitlistEntry(entry.id));
          }}
          className="text-xs font-medium text-[var(--color-coral)] hover:underline disabled:opacity-50"
        >
          Zurückziehen
        </button>
      </div>

      {suggestion ? (
        <p className="mt-2 rounded-[var(--radius-control)] bg-[var(--color-primary-soft)] px-3 py-2 text-sm text-[var(--color-primary)]">
          Vorschlag: <strong>{suggestion.employeeName}</strong> wird voraussichtlich KW {format(suggestion.fromWeek, "w")}–
          {format(suggestion.toWeek, "w")} frei ({format(suggestion.fromWeek, "dd.MM.")}–{format(suggestion.toWeek, "dd.MM.yyyy")}).
        </p>
      ) : (
        <p className="mt-2 rounded-[var(--radius-control)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text-muted)]">
          Aktuell keine passende Kapazität in Sicht (nächste {"~"}6 Monate).
        </p>
      )}

      <button onClick={() => setOpen((o) => !o)} className="mt-2 text-xs font-medium text-[var(--color-primary)] hover:underline">
        {open ? "Einplanen ausblenden" : "Einplanen"}
      </button>

      {open && (
        <ConvertForm
          entryId={entry.id}
          authority={entry.authority ?? ""}
          employees={employees}
          suggestedEmployeeId={suggestion?.employeeId ?? ""}
          suggestedStartDate={suggestion ? toDateInputValue(suggestion.fromWeek) : ""}
          defaultTotalHours={defaultTotalHours}
          defaultDurationWeeks={defaultDurationWeeks}
          defaultPhaseOutWeeks={defaultPhaseOutWeeks}
        />
      )}
    </div>
  );
}

function addWeeks(dateStr: string, weeks: number): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  d.setDate(d.getDate() + Math.round(weeks * 7));
  return toDateInputValue(d);
}

function ConvertForm({
  entryId,
  authority,
  employees,
  suggestedEmployeeId,
  suggestedStartDate,
  defaultTotalHours,
  defaultDurationWeeks,
  defaultPhaseOutWeeks,
}: {
  entryId: string;
  authority: string;
  employees: { id: string; name: string }[];
  suggestedEmployeeId: string;
  suggestedStartDate: string;
  defaultTotalHours: number | null;
  defaultDurationWeeks: number | null;
  defaultPhaseOutWeeks: number;
}) {
  const [state, formAction, pending] = useActionState<ConvertActionState, FormData>(convertWaitlistEntry, undefined);
  const [startDate, setStartDate] = useState(suggestedStartDate);
  const [expectedEndDate, setExpectedEndDate] = useState(
    defaultDurationWeeks && suggestedStartDate ? addWeeks(suggestedStartDate, defaultDurationWeeks) : ""
  );

  return (
    <form action={formAction} className="mt-3 flex flex-col gap-2.5 border-t border-[var(--color-border)] pt-3">
      <input type="hidden" name="waitlistEntryId" value={entryId} />
      <div className="flex flex-wrap gap-2">
        <input name="firstName" placeholder="Vorname" required className={`w-32 ${inputCls}`} />
        <input name="lastName" placeholder="Nachname" required className={`w-32 ${inputCls}`} />
        <input name="authority" placeholder="Jugendamt/ASD" defaultValue={authority} required className={`w-40 ${inputCls}`} />
      </div>
      <div className="flex flex-wrap gap-2">
        <select name="assignedEmployeeId" defaultValue={suggestedEmployeeId} required className={inputCls}>
          <option value="">Fachkraft wählen…</option>
          {employees.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
          Start
          <input
            name="startDate"
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              if (defaultDurationWeeks) setExpectedEndDate(addWeeks(e.target.value, defaultDurationWeeks));
            }}
            required
            className={inputCls}
          />
        </label>
        <label className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
          Vorauss. Ende
          <input name="expectedEndDate" type="date" value={expectedEndDate} onChange={(e) => setExpectedEndDate(e.target.value)} className={inputCls} />
        </label>
      </div>
      <div className="flex flex-wrap gap-2">
        <label className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
          Stundenkontingent
          <input name="hoursContingent" type="number" min="0" step="0.5" defaultValue={defaultTotalHours ?? ""} required className={`w-24 ${inputCls}`} />
        </label>
        <label className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
          Zeitraum (Monate)
          <input name="contingentPeriodMonths" type="number" min="1" max="24" defaultValue={12} className={`w-20 ${inputCls}`} />
        </label>
        <label className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
          Auslaufphase (Wochen)
          <input name="phaseOutWeeks" type="number" min="0" defaultValue={defaultPhaseOutWeeks} className={`w-20 ${inputCls}`} />
        </label>
      </div>
      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-[var(--radius-control)] bg-[var(--color-primary)] px-4 py-1.5 text-sm font-semibold text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
      >
        {pending ? "Wird angelegt…" : "Als Fall anlegen"}
      </button>
      {state?.error && <p className="text-sm text-[var(--color-coral)]">{state.error}</p>}
    </form>
  );
}
