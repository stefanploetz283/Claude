"use client";

import { useActionState } from "react";
import { updateSettings } from "./actions";
import type { Settings } from "@prisma/client";

const inputCls =
  "rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3.5 py-2.5 text-sm text-[var(--color-text)] outline-none transition focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-soft)]";
const cardCls = "rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-soft)]";
const labelCls = "text-xs font-medium text-[var(--color-text-muted)]";

export function SettingsForm({ settings }: { settings: Settings }) {
  const [state, formAction, pending] = useActionState(updateSettings, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className={cardCls}>
        <h2 className="mb-3 text-sm font-semibold text-[var(--color-text)]">Praxis &amp; Design</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className={labelCls}>Praxisname</span>
            <input name="practiceName" defaultValue={settings.practiceName} required className={inputCls} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={labelCls}>Logo hochladen (ersetzt aktuelles Logo)</span>
            <input name="logo" type="file" accept="image/*" className="text-sm" />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={labelCls}>Hauptfarbe (Buttons/Akzente)</span>
            <input name="colorPrimary" type="color" defaultValue={settings.colorPrimary} className="h-9 w-16 rounded-[var(--radius-control)] border border-[var(--color-border)]" />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={labelCls}>Hintergrundfarbe (hell)</span>
            <input name="colorAccentLight" type="color" defaultValue={settings.colorAccentLight} className="h-9 w-16 rounded-[var(--radius-control)] border border-[var(--color-border)]" />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={labelCls}>Textfarbe (dunkel)</span>
            <input name="colorTextDark" type="color" defaultValue={settings.colorTextDark} className="h-9 w-16 rounded-[var(--radius-control)] border border-[var(--color-border)]" />
          </label>
        </div>
      </div>

      <div className={cardCls}>
        <h2 className="mb-3 text-sm font-semibold text-[var(--color-text)]">Kontaktdaten (für Leistungsnachweis-Fußzeile)</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 sm:col-span-2">
            <span className={labelCls}>Adresse</span>
            <input name="practiceAddress" defaultValue={settings.practiceAddress ?? ""} placeholder="Straße Hausnr. · PLZ Ort" className={inputCls} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={labelCls}>Telefon</span>
            <input name="practicePhone" defaultValue={settings.practicePhone ?? ""} className={inputCls} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={labelCls}>E-Mail</span>
            <input name="practiceEmail" type="email" defaultValue={settings.practiceEmail ?? ""} className={inputCls} />
          </label>
        </div>
      </div>

      <div className={cardCls}>
        <h2 className="mb-3 text-sm font-semibold text-[var(--color-text)]">Rechnungsstellung</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className={labelCls}>Stundensatz (€, für Rechnungen)</span>
            <input
              name="hourlyRate"
              type="number"
              min="0"
              step="0.01"
              defaultValue={settings.hourlyRate?.toString() ?? ""}
              placeholder="z.B. 45.00"
              className={inputCls}
            />
          </label>
        </div>
      </div>

      <div className={cardCls}>
        <h2 className="mb-3 text-sm font-semibold text-[var(--color-text)]">Umsatz-Cockpit</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <label className="flex flex-col gap-1.5">
            <span className={labelCls}>Stundensatz mit VNB (€, Referenzwert)</span>
            <input name="stundensatzVnb" type="number" min="0" step="0.01" defaultValue={settings.stundensatzVnb.toString()} className={inputCls} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={labelCls}>Zielfaktor (Umsatz ÷ Personalkosten)</span>
            <input name="zielFaktor" type="number" min="0" step="0.01" defaultValue={settings.zielFaktor.toString()} className={inputCls} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={labelCls}>Mindestfaktor (Steuerberater)</span>
            <input name="mindestFaktorSteuerberater" type="number" min="0" step="0.01" defaultValue={settings.mindestFaktorSteuerberater.toString()} className={inputCls} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={labelCls}>Break-Even-Stundensatz (€)</span>
            <input name="breakEvenStundensatz" type="number" min="0" step="0.01" defaultValue={settings.breakEvenStundensatz.toString()} className={inputCls} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={labelCls}>Gesamtkosten/Jahr (€, aus Entgeltkalkulation)</span>
            <input
              name="gesamtkostenJahr"
              type="number"
              min="0"
              step="0.01"
              defaultValue={settings.gesamtkostenJahr?.toString() ?? ""}
              placeholder="z.B. 220000"
              className={inputCls}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={labelCls}>Zahlungsverzug Jugendamt (Tage)</span>
            <input
              name="zahlungsverzugTageJugendamt"
              type="number"
              min="0"
              step="1"
              defaultValue={settings.zahlungsverzugTageJugendamt}
              className={inputCls}
            />
          </label>
        </div>
      </div>

      <div className={cardCls}>
        <h2 className="mb-3 text-sm font-semibold text-[var(--color-text)]">Kapazitätsplanung</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <label className="flex flex-col gap-1.5">
            <span className={labelCls}>Abrechenbarer Anteil der Vertragsstunden</span>
            <input
              name="billableCapacityFactor"
              type="number"
              min="0"
              max="1"
              step="0.01"
              defaultValue={settings.billableCapacityFactor.toString()}
              className={inputCls}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={labelCls}>Standard-Auslaufphase (Wochen)</span>
            <input name="defaultPhaseOutWeeks" type="number" min="0" step="1" defaultValue={settings.defaultPhaseOutWeeks} className={inputCls} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={labelCls}>Richtwert parallele Fälle bei Vollzeit</span>
            <input
              name="targetParallelCasesAtFullTime"
              type="number"
              min="0"
              step="1"
              defaultValue={settings.targetParallelCasesAtFullTime}
              className={inputCls}
            />
          </label>
        </div>
      </div>

      <div className={cardCls}>
        <h2 className="mb-3 text-sm font-semibold text-[var(--color-text)]">Stundenmodell-Rechner</h2>
        <label className="flex max-w-xs flex-col gap-1.5">
          <span className={labelCls}>Aktuelle Fonds-Basis (%)</span>
          <input
            name="aktuelleFondsBasis"
            type="number"
            min="0"
            max="100"
            step="0.01"
            defaultValue={settings.aktuelleFondsBasis.toString()}
            className={inputCls}
          />
          <span className="text-xs text-[var(--color-text-muted)]">
            Neue Mitarbeiter übernehmen diesen Wert bei Einstellung als Bestandsschutz-Snapshot.
          </span>
        </label>
      </div>

      <div className={cardCls}>
        <h2 className="mb-3 text-sm font-semibold text-[var(--color-text)]">Verhalten</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className={labelCls}>Kontingent-Warnschwelle (%)</span>
            <input name="contingentWarningThreshold" type="number" min="1" max="100" defaultValue={settings.contingentWarningThreshold} className={inputCls} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={labelCls}>Auto-Abmeldung nach Inaktivität (Minuten)</span>
            <input name="sessionIdleTimeoutMinutes" type="number" min="1" defaultValue={settings.sessionIdleTimeoutMinutes} className={inputCls} />
          </label>
        </div>
        <label className="mt-3 flex items-center gap-2 text-sm text-[var(--color-text)]">
          <input type="checkbox" name="employeesCanContributeKnowledge" defaultChecked={settings.employeesCanContributeKnowledge} />
          Mitarbeiter dürfen eigene Inhalte in der Fachbox beitragen (nicht nur lesen)
        </label>
      </div>

      {state?.error && <p className="text-sm text-[var(--color-coral)]">{state.error}</p>}
      {state?.success && <p className="text-sm text-[var(--color-green-medium)]">{state.success}</p>}

      <div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-[var(--radius-control)] bg-[var(--color-primary)] px-5 py-2.5 text-sm font-semibold text-white shadow-[var(--shadow-soft)] transition hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
        >
          {pending ? "Speichern…" : "Speichern"}
        </button>
      </div>
    </form>
  );
}
