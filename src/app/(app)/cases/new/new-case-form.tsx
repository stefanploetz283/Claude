"use client";

import { useActionState, useState } from "react";
import { createCase } from "../actions";
import { toDateInputValue } from "@/lib/date";

type Client = { id: string; firstName: string; lastName: string; birthDate: string | null };
type Employee = { id: string; name: string };
type HelpType = {
  id: string;
  name: string;
  defaultDurationWeeks: number | null;
  defaultTotalHoursMin: number | null;
  defaultTotalHoursMax: number | null;
};

const inputCls =
  "w-full rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3.5 py-2.5 text-sm text-[var(--color-text)] outline-none transition focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-soft)]";
const cardCls = "rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-soft)]";

function addWeeks(dateStr: string, weeks: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + Math.round(weeks * 7));
  return toDateInputValue(d);
}

export function NewCaseForm({
  clients,
  employees,
  helpTypes,
  defaultEmployeeId,
  defaultPhaseOutWeeks,
}: {
  clients: Client[];
  employees: Employee[];
  helpTypes: HelpType[];
  defaultEmployeeId: string;
  defaultPhaseOutWeeks: number;
}) {
  const [state, formAction, pending] = useActionState(createCase, undefined);
  const [clientMode, setClientMode] = useState<"existing" | "new">(clients.length ? "existing" : "new");

  const [startDate, setStartDate] = useState(toDateInputValue(new Date()));
  const [helpTypeId, setHelpTypeId] = useState("");
  const [hoursContingent, setHoursContingent] = useState("");
  const [expectedEndDate, setExpectedEndDate] = useState("");

  function applyHelpTypeDefaults(id: string, fromDate: string) {
    const helpType = helpTypes.find((h) => h.id === id);
    if (!helpType) return;
    if (helpType.defaultDurationWeeks) {
      setExpectedEndDate(addWeeks(fromDate, helpType.defaultDurationWeeks));
    }
    if (helpType.defaultTotalHoursMin != null && helpType.defaultTotalHoursMax != null) {
      setHoursContingent((((helpType.defaultTotalHoursMin + helpType.defaultTotalHoursMax) / 2).toFixed(1)));
    } else if (helpType.defaultTotalHoursMin != null) {
      setHoursContingent(helpType.defaultTotalHoursMin.toFixed(1));
    }
  }

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <section className={cardCls}>
        <h2 className="mb-4 text-sm font-semibold text-[var(--color-text)]">Klient</h2>
        <div className="mb-4 flex gap-4 text-sm text-[var(--color-text)]">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              checked={clientMode === "existing"}
              onChange={() => setClientMode("existing")}
              disabled={!clients.length}
            />
            Bestehender Klient
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" checked={clientMode === "new"} onChange={() => setClientMode("new")} />
            Neuer Klient
          </label>
        </div>

        {clientMode === "existing" ? (
          <select name="existingClientId" className={`max-w-md ${inputCls}`}>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.lastName}, {c.firstName} {c.birthDate ? `(${c.birthDate})` : ""}
              </option>
            ))}
          </select>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Vorname">
              <input name="firstName" required className={inputCls} />
            </Field>
            <Field label="Nachname">
              <input name="lastName" required className={inputCls} />
            </Field>
            <Field label="Geburtsdatum">
              <input name="birthDate" type="date" className={inputCls} />
            </Field>
            <Field label="Straße">
              <input name="street" placeholder="Musterstraße 12" className={inputCls} />
            </Field>
            <Field label="PLZ / Ort">
              <input name="postalCodeCity" placeholder="12345 Musterstadt" className={inputCls} />
            </Field>
            <Field label="Kontaktdaten (Telefon/E-Mail)">
              <input name="contactInfo" className={inputCls} />
            </Field>
          </div>
        )}
      </section>

      <section className={cardCls}>
        <h2 className="mb-4 text-sm font-semibold text-[var(--color-text)]">Hilfe / Fall</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Zuständiges Jugendamt/Auftraggeber (ASD)">
            <input name="authority" required className={inputCls} />
          </Field>
          <Field label="Hilfeart">
            <select
              name="helpTypeId"
              required
              value={helpTypeId}
              onChange={(e) => {
                setHelpTypeId(e.target.value);
                applyHelpTypeDefaults(e.target.value, startDate);
              }}
              className={inputCls}
            >
              <option value="">Bitte wählen…</option>
              {helpTypes.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Zuständiger Mitarbeiter">
            <select name="assignedEmployeeId" required defaultValue={defaultEmployeeId} className={inputCls}>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Stundenkontingent (Std.)">
            <input
              name="hoursContingent"
              type="number"
              min="0"
              step="0.5"
              required
              value={hoursContingent}
              onChange={(e) => setHoursContingent(e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Zeitraum (Monate, in denen das Kontingent aufgebraucht werden muss)">
            <input name="contingentPeriodMonths" type="number" min="1" max="24" step="1" required defaultValue={12} className={inputCls} />
          </Field>
          <Field label="Vertretung (optional)">
            <select name="substituteEmployeeId" className={inputCls}>
              <option value="">Keine</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Startdatum">
            <input
              name="startDate"
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                if (helpTypeId) applyHelpTypeDefaults(helpTypeId, e.target.value);
              }}
              className={inputCls}
            />
          </Field>
          <Field label="Voraussichtliches Enddatum (Kapazitätsplanung)">
            <input
              name="expectedEndDate"
              type="date"
              value={expectedEndDate}
              onChange={(e) => setExpectedEndDate(e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Auslaufphase (Wochen, optional)">
            <input name="phaseOutWeeks" type="number" min="0" step="1" defaultValue={defaultPhaseOutWeeks} className={inputCls} />
          </Field>
          <Field label="Vorlaufzeit Erinnerungen (Tage)">
            <input name="reminderLeadDays" type="number" min="1" defaultValue={14} className={inputCls} />
          </Field>
          <Field label="Hilfeplangespräch (optional)">
            <input name="helpPlanMeetingDate" type="date" className={inputCls} />
          </Field>
          <Field label="Frist Verlängerungsantrag (optional)">
            <input name="extensionDeadline" type="date" className={inputCls} />
          </Field>
        </div>
      </section>

      {state?.error && <p className="text-sm text-[var(--color-coral)]">{state.error}</p>}

      <div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-[var(--radius-control)] bg-[var(--color-primary)] px-5 py-2.5 text-sm font-semibold text-white shadow-[var(--shadow-soft)] transition hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
        >
          {pending ? "Wird angelegt…" : "Fall anlegen"}
        </button>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-[var(--color-text-muted)]">{label}</span>
      {children}
    </label>
  );
}
