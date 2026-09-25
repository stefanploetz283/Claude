"use client";

import { useActionState } from "react";
import { updateSettings } from "./actions";
import type { Settings } from "@prisma/client";
import { ProsSectionCard } from "@/components/pros/pros-card";
import { IconCheck } from "@/components/pros/pros-icons";
import { inputCls, labelCls, buttonPrimaryCls, errorTextCls, noticeSuccessCls } from "@/app/(app)/cases/case-ui";

const fieldCls = `w-full ${inputCls}`;
const helpCls = "text-xs text-[var(--color-text-muted)]";
// Datei-Auswahl im Eingabefeld-Look: der native "Durchsuchen"-Button bekommt die Salbei-Sekundärfläche.
const fileCls = `${fieldCls} file:mr-3 file:rounded-[var(--pros-r-sm)] file:border-0 file:bg-[var(--pros-sage-soft)] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-[var(--color-primary)]`;
const colorCls =
  "h-10 w-16 cursor-pointer rounded-[var(--pros-r-sm)] border border-[var(--pros-border-strong)] bg-[var(--color-surface)] p-1";

export function SettingsForm({ settings }: { settings: Settings }) {
  const [state, formAction, pending] = useActionState(updateSettings, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-2">
        <ProsSectionCard title="Praxis & Design">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className={labelCls}>Praxisname</span>
              <input name="practiceName" defaultValue={settings.practiceName} required className={fieldCls} />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={labelCls}>Logo hochladen (ersetzt aktuelles Logo)</span>
              <input name="logo" type="file" accept="image/*" className={fileCls} />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={labelCls}>Hauptfarbe (Buttons/Akzente)</span>
              <input name="colorPrimary" type="color" defaultValue={settings.colorPrimary} className={colorCls} />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={labelCls}>Hintergrundfarbe (hell)</span>
              <input name="colorAccentLight" type="color" defaultValue={settings.colorAccentLight} className={colorCls} />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={labelCls}>Textfarbe (dunkel)</span>
              <input name="colorTextDark" type="color" defaultValue={settings.colorTextDark} className={colorCls} />
            </label>
          </div>
        </ProsSectionCard>

        <ProsSectionCard title="Kontaktdaten (für Leistungsnachweis-Fußzeile)">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5 sm:col-span-2">
              <span className={labelCls}>Adresse</span>
              <input name="practiceAddress" defaultValue={settings.practiceAddress ?? ""} placeholder="Straße Hausnr. · PLZ Ort" className={fieldCls} />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={labelCls}>Telefon</span>
              <input name="practicePhone" defaultValue={settings.practicePhone ?? ""} className={fieldCls} />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={labelCls}>E-Mail</span>
              <input name="practiceEmail" type="email" defaultValue={settings.practiceEmail ?? ""} className={fieldCls} />
            </label>
          </div>
        </ProsSectionCard>

        <ProsSectionCard title="Rechnungsstellung">
          <label className="flex max-w-sm flex-col gap-1.5">
            <span className={labelCls}>Stundensatz (€, für Rechnungen)</span>
            <input
              name="hourlyRate"
              type="number"
              min="0"
              step="0.01"
              defaultValue={settings.hourlyRate?.toString() ?? ""}
              placeholder="z.B. 45.00"
              className={fieldCls}
            />
          </label>
        </ProsSectionCard>

        <ProsSectionCard title="Betriebswirtschaftliches Cockpit">
          <p className="text-sm leading-relaxed text-[var(--color-text-muted)]">
            Kalkulationswerte (Ziel-Quote, Ziel-Faktor, Personal-/Betriebskosten-Plan, ...) werden versioniert direkt im{" "}
            <a href="/finanzen/cockpit" className="font-semibold text-[var(--color-primary)] hover:underline">
              Cockpit
            </a>{" "}
            gepflegt, nicht hier – so bleibt bei einer neuen Entgeltkalkulation die bisherige Version als Historie erhalten.
          </p>
        </ProsSectionCard>

        <ProsSectionCard title="Kapazitätsplanung" className="xl:col-span-2">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <label className="flex flex-col gap-1.5">
              <span className={labelCls}>Abrechenbarer Anteil der Vertragsstunden</span>
              <input
                name="billableCapacityFactor"
                type="number"
                min="0"
                max="1"
                step="0.01"
                defaultValue={settings.billableCapacityFactor.toString()}
                className={fieldCls}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={labelCls}>Standard-Auslaufphase (Wochen)</span>
              <input name="defaultPhaseOutWeeks" type="number" min="0" step="1" defaultValue={settings.defaultPhaseOutWeeks} className={fieldCls} />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={labelCls}>Richtwert parallele Fälle bei Vollzeit</span>
              <input
                name="targetParallelCasesAtFullTime"
                type="number"
                min="0"
                step="1"
                defaultValue={settings.targetParallelCasesAtFullTime}
                className={fieldCls}
              />
            </label>
          </div>
        </ProsSectionCard>

        <ProsSectionCard title="Stundenmodell-Rechner">
          <label className="flex max-w-xs flex-col gap-1.5">
            <span className={labelCls}>Aktuelle Fonds-Basis (%)</span>
            <input
              name="aktuelleFondsBasis"
              type="number"
              min="0"
              max="100"
              step="0.01"
              defaultValue={settings.aktuelleFondsBasis.toString()}
              className={fieldCls}
            />
            <span className={helpCls}>Neue Mitarbeiter übernehmen diesen Wert bei Einstellung als Bestandsschutz-Snapshot.</span>
          </label>
        </ProsSectionCard>

        <ProsSectionCard title="Fahrten-/Fallrechner">
          <label className="flex max-w-xs flex-col gap-1.5">
            <span className={labelCls}>Ø Geschwindigkeit für Fahrzeitschätzung (km/h)</span>
            <input
              name="fahrtenrechnerDurchschnittskmh"
              type="number"
              min="1"
              step="1"
              defaultValue={settings.fahrtenrechnerDurchschnittskmh.toString()}
              className={fieldCls}
            />
            <span className={helpCls}>Umrechnung geschätzte Fahrstrecke → Fahrzeit im Fahrten-/Fallrechner (Admin/Verwaltung).</span>
          </label>
        </ProsSectionCard>

        <ProsSectionCard title="Verhalten" className="xl:col-span-2">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className={labelCls}>Kontingent-Warnschwelle (%)</span>
              <input name="contingentWarningThreshold" type="number" min="1" max="100" defaultValue={settings.contingentWarningThreshold} className={fieldCls} />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={labelCls}>Auto-Abmeldung nach Inaktivität (Minuten)</span>
              <input name="sessionIdleTimeoutMinutes" type="number" min="1" defaultValue={settings.sessionIdleTimeoutMinutes} className={fieldCls} />
            </label>
          </div>
          <label className="mt-4 flex items-center gap-2.5 text-sm text-[var(--color-text)]">
            <input
              type="checkbox"
              name="employeesCanContributeKnowledge"
              defaultChecked={settings.employeesCanContributeKnowledge}
              className="h-4 w-4 shrink-0 accent-[var(--color-primary)]"
            />
            Mitarbeiter dürfen eigene Inhalte in der Fachbox beitragen (nicht nur lesen)
          </label>
        </ProsSectionCard>
      </div>

      {state?.error && (
        <p role="alert" className={errorTextCls}>
          {state.error}
        </p>
      )}
      {state?.success && (
        <p role="status" className={noticeSuccessCls}>
          <IconCheck size={16} />
          {state.success}
        </p>
      )}

      <div>
        <button type="submit" disabled={pending} className={buttonPrimaryCls}>
          {pending ? "Speichern…" : "Speichern"}
        </button>
      </div>
    </form>
  );
}
