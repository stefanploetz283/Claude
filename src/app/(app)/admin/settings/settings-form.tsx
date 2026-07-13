"use client";

import { useActionState } from "react";
import { updateSettings } from "./actions";
import type { Settings } from "@prisma/client";

const inputCls = "rounded-md border border-black/15 px-3 py-1.5 text-sm";

export function SettingsForm({ settings }: { settings: Settings }) {
  const [state, formAction, pending] = useActionState(updateSettings, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="rounded-lg border border-black/10 bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold text-[var(--color-text)]">Praxis &amp; Design</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-black/60">Praxisname</span>
            <input name="practiceName" defaultValue={settings.practiceName} required className={inputCls} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-black/60">Logo hochladen (ersetzt aktuelles Logo)</span>
            <input name="logo" type="file" accept="image/*" className="text-sm" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-black/60">Hauptfarbe (Buttons/Akzente)</span>
            <input name="colorPrimary" type="color" defaultValue={settings.colorPrimary} className="h-9 w-16 rounded border border-black/15" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-black/60">Hintergrundfarbe (hell)</span>
            <input name="colorAccentLight" type="color" defaultValue={settings.colorAccentLight} className="h-9 w-16 rounded border border-black/15" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-black/60">Textfarbe (dunkel)</span>
            <input name="colorTextDark" type="color" defaultValue={settings.colorTextDark} className="h-9 w-16 rounded border border-black/15" />
          </label>
        </div>
      </div>

      <div className="rounded-lg border border-black/10 bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold text-[var(--color-text)]">Verhalten</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-black/60">Kontingent-Warnschwelle (%)</span>
            <input name="contingentWarningThreshold" type="number" min="1" max="100" defaultValue={settings.contingentWarningThreshold} className={inputCls} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-black/60">Auto-Abmeldung nach Inaktivität (Minuten)</span>
            <input name="sessionIdleTimeoutMinutes" type="number" min="1" defaultValue={settings.sessionIdleTimeoutMinutes} className={inputCls} />
          </label>
        </div>
        <label className="mt-3 flex items-center gap-2 text-sm">
          <input type="checkbox" name="employeesCanContributeKnowledge" defaultChecked={settings.employeesCanContributeKnowledge} />
          Mitarbeiter dürfen eigene Inhalte in der Fachbox beitragen (nicht nur lesen)
        </label>
      </div>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.success && <p className="text-sm text-green-700">{state.success}</p>}

      <div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-[var(--color-primary)] px-5 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "Speichern…" : "Speichern"}
        </button>
      </div>
    </form>
  );
}
