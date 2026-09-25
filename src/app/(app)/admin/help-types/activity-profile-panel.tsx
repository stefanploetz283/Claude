"use client";

import { useActionState, useState, useTransition } from "react";
import {
  updateHelpTypeDefaults,
  addActivityProfileRow,
  updateActivityProfileRow,
  deleteActivityProfileRow,
  type DefaultsActionState,
} from "./actions";
import { IconChevronDown } from "@/components/pros/pros-icons";
import { filterFieldCls, labelCls, buttonSmOutlineCls, buttonSmPrimaryCls, errorTextCls, linkActionCls, linkDangerCls } from "@/app/(app)/cases/case-ui";

type Profile = { id: string; activityLabel: string; hoursPerWeek: string | null };

export function ActivityProfilePanel({
  helpTypeId,
  defaultDurationWeeks,
  defaultTotalHoursMin,
  defaultTotalHoursMax,
  profiles,
}: {
  helpTypeId: string;
  defaultDurationWeeks: number | null;
  defaultTotalHoursMin: string | null;
  defaultTotalHoursMax: string | null;
  profiles: Profile[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="w-full">
      <button type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)} className={`inline-flex items-center gap-1 ${linkActionCls}`}>
        <IconChevronDown size={14} className={`transition-transform duration-[170ms] motion-reduce:transition-none ${open ? "rotate-180" : ""}`} />
        {open ? "Wochenprofil ausblenden" : "Wochenprofil bearbeiten"}
      </button>
      {open && (
        <div className="mt-3 min-w-[18rem] rounded-[var(--pros-r-sm)] border border-[var(--pros-border-default)] bg-[var(--pros-sage-pale)]/60 p-4">
          <DefaultsForm
            helpTypeId={helpTypeId}
            defaultDurationWeeks={defaultDurationWeeks}
            defaultTotalHoursMin={defaultTotalHoursMin}
            defaultTotalHoursMax={defaultTotalHoursMax}
          />
          <div className="mt-4 border-t border-[var(--pros-border-default)] pt-4">
            <p className="mb-2 text-xs font-semibold text-[var(--color-text)]">Wochenprofil-Komponenten</p>
            <div className="flex flex-col gap-2">
              {profiles.map((p) => (
                <ProfileRow key={p.id} profile={p} />
              ))}
              {profiles.length === 0 && <p className="text-sm text-[var(--color-text-muted)]">Noch keine Komponenten.</p>}
            </div>
            <AddRowForm helpTypeId={helpTypeId} />
          </div>
        </div>
      )}
    </div>
  );
}

function DefaultsForm({
  helpTypeId,
  defaultDurationWeeks,
  defaultTotalHoursMin,
  defaultTotalHoursMax,
}: {
  helpTypeId: string;
  defaultDurationWeeks: number | null;
  defaultTotalHoursMin: string | null;
  defaultTotalHoursMax: string | null;
}) {
  const [state, formAction, pending] = useActionState<DefaultsActionState, FormData>(updateHelpTypeDefaults, undefined);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="helpTypeId" value={helpTypeId} />
      <label className="flex flex-col gap-1.5">
        <span className={labelCls}>Laufzeit (Wochen)</span>
        <input name="defaultDurationWeeks" type="number" min="1" step="0.1" defaultValue={defaultDurationWeeks ?? ""} className={`w-28 ${filterFieldCls}`} />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className={labelCls}>Gesamtstunden von</span>
        <input name="defaultTotalHoursMin" type="number" min="0" step="0.5" defaultValue={defaultTotalHoursMin ?? ""} className={`w-28 ${filterFieldCls}`} />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className={labelCls}>bis</span>
        <input name="defaultTotalHoursMax" type="number" min="0" step="0.5" defaultValue={defaultTotalHoursMax ?? ""} className={`w-28 ${filterFieldCls}`} />
      </label>
      <button type="submit" disabled={pending} className={`${buttonSmOutlineCls} py-2.5!`}>
        {pending ? "Speichern…" : "Speichern"}
      </button>
      {state?.error && (
        <p role="alert" className={`w-full ${errorTextCls}`}>
          {state.error}
        </p>
      )}
    </form>
  );
}

function ProfileRow({ profile }: { profile: Profile }) {
  const [label, setLabel] = useState(profile.activityLabel);
  const [hours, setHours] = useState(profile.hoursPerWeek ?? "");
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input value={label} onChange={(e) => setLabel(e.target.value)} aria-label="Bezeichnung der Komponente" className={`min-w-[10rem] flex-1 ${filterFieldCls}`} />
      <input
        value={hours}
        onChange={(e) => setHours(e.target.value)}
        type="number"
        min="0"
        step="0.01"
        placeholder="Std./Woche"
        aria-label="Stunden pro Woche"
        className={`w-32 ${filterFieldCls}`}
      />
      <button disabled={pending} onClick={() => startTransition(() => updateActivityProfileRow(profile.id, label, hours))} className={linkActionCls}>
        Speichern
      </button>
      <button disabled={pending} onClick={() => startTransition(() => deleteActivityProfileRow(profile.id))} className={linkDangerCls}>
        Löschen
      </button>
    </div>
  );
}

function AddRowForm({ helpTypeId }: { helpTypeId: string }) {
  const [label, setLabel] = useState("");
  const [hours, setHours] = useState("");
  const [pending, startTransition] = useTransition();

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[var(--pros-border-default)] pt-3">
      <input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="Neue Komponente, z.B. Einzelzeit Kind"
        aria-label="Neue Komponente"
        className={`min-w-[10rem] flex-1 ${filterFieldCls}`}
      />
      <input
        value={hours}
        onChange={(e) => setHours(e.target.value)}
        type="number"
        min="0"
        step="0.01"
        placeholder="Std./Woche (optional)"
        aria-label="Stunden pro Woche (optional)"
        className={`w-44 ${filterFieldCls}`}
      />
      <button
        disabled={pending || !label.trim()}
        onClick={() =>
          startTransition(async () => {
            await addActivityProfileRow(helpTypeId, label, hours);
            setLabel("");
            setHours("");
          })
        }
        className={`${buttonSmPrimaryCls} py-2.5!`}
      >
        Hinzufügen
      </button>
    </div>
  );
}
