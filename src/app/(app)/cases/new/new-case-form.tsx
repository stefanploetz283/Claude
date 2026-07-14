"use client";

import { useActionState, useState } from "react";
import { createCase } from "../actions";

type Client = { id: string; firstName: string; lastName: string; birthDate: string | null };
type Employee = { id: string; name: string };
type HelpType = { id: string; name: string };

const inputCls = "w-full rounded-md border border-black/15 px-3 py-1.5 text-sm";

export function NewCaseForm({
  clients,
  employees,
  helpTypes,
  defaultEmployeeId,
}: {
  clients: Client[];
  employees: Employee[];
  helpTypes: HelpType[];
  defaultEmployeeId: string;
}) {
  const [state, formAction, pending] = useActionState(createCase, undefined);
  const [clientMode, setClientMode] = useState<"existing" | "new">(clients.length ? "existing" : "new");

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <section className="rounded-lg border border-black/10 bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold text-[var(--color-text)]">Klient</h2>
        <div className="mb-4 flex gap-4 text-sm">
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
          <select name="existingClientId" className="w-full max-w-md rounded-md border border-black/15 px-3 py-1.5 text-sm">
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
            <Field label="Adresse">
              <input name="address" className={inputCls} />
            </Field>
            <Field label="Kontaktdaten (Telefon/E-Mail)">
              <input name="contactInfo" className={inputCls} />
            </Field>
          </div>
        )}
      </section>

      <section className="rounded-lg border border-black/10 bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold text-[var(--color-text)]">Hilfe / Fall</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Aktenzeichen/Fallnummer">
            <input name="caseNumber" required className={inputCls} />
          </Field>
          <Field label="Zuständiges Jugendamt/Auftraggeber">
            <input name="authority" required className={inputCls} />
          </Field>
          <Field label="Hilfeart">
            <select name="helpTypeId" required className={inputCls}>
              <option value="">Bitte wählen…</option>
              {helpTypes.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Stundenkontingent">
            <input name="hoursContingent" type="number" min="0" step="0.5" required className={inputCls} />
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
            <input name="startDate" type="date" defaultValue={new Date().toISOString().slice(0, 10)} className={inputCls} />
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

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-[var(--color-primary)] px-5 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "Wird angelegt…" : "Fall anlegen"}
        </button>
      </div>

    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-black/60">{label}</span>
      {children}
    </label>
  );
}
