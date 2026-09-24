"use client";

import { useActionState } from "react";
import { createInterimCase } from "../actions";
import { cardCls, inputCls, labelCls, buttonPrimaryCls, groupPillCls } from "../interim-ui";

function GroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="sm:col-span-2">
      <span className={groupPillCls}>{children}</span>
    </div>
  );
}

export function NewInterimCaseForm() {
  const [state, formAction, pending] = useActionState(createInterimCase, undefined);

  return (
    <form action={formAction} className={`${cardCls} flex flex-col gap-4`}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <GroupLabel>Angebot</GroupLabel>
        <label className="flex flex-col gap-1.5">
          <span className={labelCls}>Angebotsart</span>
          <select name="angebotsart" required defaultValue="" className={`w-full ${inputCls}`}>
            <option value="" disabled>
              Bitte wählen…
            </option>
            <option value="ERZIEHUNGSBEISTANDSCHAFT">Erziehungsbeistandschaft</option>
            <option value="PROS">PROS</option>
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={labelCls}>Leistungserbringer(in)</span>
          <input name="leistungserbringer" defaultValue="Stefan Plötz" className={`w-full ${inputCls}`} />
        </label>

        <GroupLabel>Person</GroupLabel>
        <label className="flex flex-col gap-1.5">
          <span className={labelCls}>Familienname des Kindes/Jugendlichen</span>
          <input name="familienname" required className={`w-full ${inputCls}`} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={labelCls}>Vorname</span>
          <input name="vorname" required className={`w-full ${inputCls}`} />
        </label>

        <GroupLabel>Anschrift</GroupLabel>
        <label className="flex flex-col gap-1.5">
          <span className={labelCls}>Straße, Hausnummer</span>
          <input name="strasseHausnummer" required className={`w-full ${inputCls}`} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={labelCls}>PLZ, Ort</span>
          <input name="plzOrt" required className={`w-full ${inputCls}`} />
        </label>

        <GroupLabel>Zuständigkeit &amp; Konditionen</GroupLabel>
        <label className="flex flex-col gap-1.5">
          <span className={labelCls}>Sachbearbeiter(in) SPFD</span>
          <input name="sachbearbeiterSpfd" required className={`w-full ${inputCls}`} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={labelCls}>Bewilligte Wochenstunden lt. Bescheid</span>
          <input name="bewilligteWochenstunden" type="number" min="0" step="0.01" required className={`w-full ${inputCls}`} />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className={labelCls}>Honorar pro Stunde (€)</span>
          <input name="honorarProStunde" type="number" min="0" step="0.01" required className={`w-full ${inputCls}`} />
        </label>
      </div>

      {state?.error && <p className="text-sm text-[var(--pros-status-critical-text)]">{state.error}</p>}

      <div>
        <button type="submit" disabled={pending} className={buttonPrimaryCls}>
          {pending ? "Wird angelegt…" : "Fall anlegen"}
        </button>
      </div>
    </form>
  );
}
