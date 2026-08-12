"use client";

import { useEffect, useRef, useState } from "react";
import { useActionState } from "react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { updateInterimCase } from "../actions";

const inputCls =
  "w-full rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3.5 py-2.5 text-sm text-[var(--color-text)] outline-none transition focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-soft)]";
const labelCls = "text-xs font-medium text-[var(--color-text-muted)]";

export type InterimCaseDetails = {
  id: string;
  angebotsart: "ERZIEHUNGSBEISTANDSCHAFT" | "PROS";
  familienname: string;
  vorname: string;
  strasseHausnummer: string;
  plzOrt: string;
  sachbearbeiterSpfd: string;
  bewilligteWochenstunden: string;
  honorarProStunde: string;
  leistungserbringer: string;
  createdAt: Date;
};

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-[var(--color-text-muted)]">{label}</dt>
      <dd className="text-right text-[var(--color-text)]">{value}</dd>
    </div>
  );
}

export function CaseDetailsCard({ data }: { data: InterimCaseDetails }) {
  const [editing, setEditing] = useState(false);
  const [state, formAction, pending] = useActionState(updateInterimCase, undefined);

  // Formular erst bei erfolgreichem Speichern schließen - bei einem Validierungsfehler soll die Eingabe
  // des Nutzers sichtbar/erhalten bleiben statt stillschweigend zu verschwinden.
  const submittedRef = useRef(false);
  useEffect(() => {
    if (submittedRef.current && !pending) {
      submittedRef.current = false;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (!state?.error) setEditing(false);
    }
  }, [state, pending]);

  const cardCls = "rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-soft)]";

  if (!editing) {
    return (
      <div className={cardCls}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[var(--color-text)]">Falldaten</h2>
          <button onClick={() => setEditing(true)} className="text-xs font-semibold text-[var(--color-primary)] hover:underline">
            Bearbeiten
          </button>
        </div>
        <dl className="flex flex-col gap-2 text-sm">
          <Row label="Familienname" value={data.familienname} />
          <Row label="Vorname" value={data.vorname} />
          <Row label="Straße, Hausnummer" value={data.strasseHausnummer} />
          <Row label="PLZ, Ort" value={data.plzOrt} />
          <Row
            label="Angebotsart"
            value={data.angebotsart === "PROS" ? "PROS" : "Erziehungsbeistandschaft"}
          />
          <Row label="Sachbearbeiter(in) SPFD" value={data.sachbearbeiterSpfd} />
          <Row label="Bewilligte Wochenstunden" value={`${data.bewilligteWochenstunden} Std.`} />
          <Row label="Honorar pro Stunde" value={`${data.honorarProStunde} €`} />
          <Row label="Leistungserbringer(in)" value={data.leistungserbringer} />
          <Row label="Angelegt am" value={format(data.createdAt, "dd.MM.yyyy", { locale: de })} />
        </dl>
      </div>
    );
  }

  return (
    <div className={cardCls}>
      <h2 className="mb-3 text-sm font-semibold text-[var(--color-text)]">Falldaten bearbeiten</h2>
      <form
        action={(fd) => {
          submittedRef.current = true;
          formAction(fd);
        }}
        className="flex flex-col gap-3"
      >
        <input type="hidden" name="id" value={data.id} />
        <label className="flex flex-col gap-1.5">
          <span className={labelCls}>Angebotsart</span>
          <select name="angebotsart" defaultValue={data.angebotsart} required className={inputCls}>
            <option value="ERZIEHUNGSBEISTANDSCHAFT">Erziehungsbeistandschaft</option>
            <option value="PROS">PROS</option>
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={labelCls}>Familienname des Kindes/Jugendlichen</span>
          <input name="familienname" defaultValue={data.familienname} required className={inputCls} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={labelCls}>Vorname</span>
          <input name="vorname" defaultValue={data.vorname} required className={inputCls} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={labelCls}>Straße, Hausnummer</span>
          <input name="strasseHausnummer" defaultValue={data.strasseHausnummer} required className={inputCls} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={labelCls}>PLZ, Ort</span>
          <input name="plzOrt" defaultValue={data.plzOrt} required className={inputCls} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={labelCls}>Sachbearbeiter(in) SPFD</span>
          <input name="sachbearbeiterSpfd" defaultValue={data.sachbearbeiterSpfd} required className={inputCls} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={labelCls}>Bewilligte Wochenstunden lt. Bescheid</span>
          <input
            name="bewilligteWochenstunden"
            type="number"
            min="0"
            step="0.01"
            defaultValue={data.bewilligteWochenstunden}
            required
            className={inputCls}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={labelCls}>Honorar pro Stunde (€)</span>
          <input name="honorarProStunde" type="number" min="0" step="0.01" defaultValue={data.honorarProStunde} required className={inputCls} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={labelCls}>Leistungserbringer(in)</span>
          <input name="leistungserbringer" defaultValue={data.leistungserbringer} className={inputCls} />
        </label>

        {state?.error && <p className="text-sm text-[var(--color-coral)]">{state.error}</p>}

        <div className="flex items-center gap-2">
          <button
            type="submit"
            disabled={pending}
            className="rounded-[var(--radius-control)] bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white shadow-[var(--shadow-soft)] transition hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
          >
            {pending ? "Wird gespeichert…" : "Speichern"}
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="rounded-[var(--radius-control)] border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-[var(--color-text)]"
          >
            Abbrechen
          </button>
        </div>
      </form>
    </div>
  );
}
