"use client";

import { useActionState } from "react";
import { createInterimCase } from "../actions";

const inputCls =
  "w-full rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3.5 py-2.5 text-sm text-[var(--color-text)] outline-none transition focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-soft)]";
const cardCls = "rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-soft)]";
const labelCls = "text-xs font-medium text-[var(--color-text-muted)]";

export function NewInterimCaseForm() {
  const [state, formAction, pending] = useActionState(createInterimCase, undefined);

  return (
    <form action={formAction} className={`${cardCls} flex flex-col gap-4`}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className={labelCls}>Angebotsart</span>
          <select name="angebotsart" required defaultValue="" className={inputCls}>
            <option value="" disabled>
              Bitte wählen…
            </option>
            <option value="ERZIEHUNGSBEISTANDSCHAFT">Erziehungsbeistandschaft</option>
            <option value="PROS">PROS</option>
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={labelCls}>Leistungserbringer(in)</span>
          <input name="leistungserbringer" defaultValue="Stefan Plötz" className={inputCls} />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className={labelCls}>Familienname des Kindes/Jugendlichen</span>
          <input name="familienname" required className={inputCls} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={labelCls}>Vorname</span>
          <input name="vorname" required className={inputCls} />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className={labelCls}>Straße, Hausnummer</span>
          <input name="strasseHausnummer" required className={inputCls} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={labelCls}>PLZ, Ort</span>
          <input name="plzOrt" required className={inputCls} />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className={labelCls}>Sachbearbeiter(in) SPFD</span>
          <input name="sachbearbeiterSpfd" required className={inputCls} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={labelCls}>Bewilligte Wochenstunden lt. Bescheid</span>
          <input name="bewilligteWochenstunden" type="number" min="0" step="0.01" required className={inputCls} />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className={labelCls}>Honorar pro Stunde (€)</span>
          <input name="honorarProStunde" type="number" min="0" step="0.01" required className={inputCls} />
        </label>
      </div>

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
