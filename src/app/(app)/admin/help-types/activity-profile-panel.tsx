"use client";

import { useActionState, useState, useTransition } from "react";
import {
  updateHelpTypeDefaults,
  addActivityProfileRow,
  updateActivityProfileRow,
  deleteActivityProfileRow,
  type DefaultsActionState,
} from "./actions";

type Profile = { id: string; activityLabel: string; hoursPerWeek: string | null };

const inputCls =
  "rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-1.5 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]";

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
    <div className="mt-2">
      <button onClick={() => setOpen((o) => !o)} className="text-xs font-medium text-[var(--color-primary)] hover:underline">
        {open ? "Wochenprofil ausblenden" : "Wochenprofil bearbeiten"}
      </button>
      {open && (
        <div className="mt-3 rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-bg)] p-4">
          <DefaultsForm
            helpTypeId={helpTypeId}
            defaultDurationWeeks={defaultDurationWeeks}
            defaultTotalHoursMin={defaultTotalHoursMin}
            defaultTotalHoursMax={defaultTotalHoursMax}
          />
          <div className="mt-4">
            <p className="mb-2 text-xs font-semibold tracking-wide text-[var(--color-text-muted)] uppercase">Wochenprofil-Komponenten</p>
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
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-[var(--color-text-muted)]">Laufzeit (Wochen)</span>
        <input name="defaultDurationWeeks" type="number" min="1" step="0.1" defaultValue={defaultDurationWeeks ?? ""} className={`w-28 ${inputCls}`} />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-[var(--color-text-muted)]">Gesamtstunden von</span>
        <input name="defaultTotalHoursMin" type="number" min="0" step="0.5" defaultValue={defaultTotalHoursMin ?? ""} className={`w-28 ${inputCls}`} />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-[var(--color-text-muted)]">bis</span>
        <input name="defaultTotalHoursMax" type="number" min="0" step="0.5" defaultValue={defaultTotalHoursMax ?? ""} className={`w-28 ${inputCls}`} />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-[var(--radius-control)] border border-[var(--color-primary)] px-3 py-1.5 text-sm font-medium text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white disabled:opacity-50"
      >
        {pending ? "Speichern…" : "Speichern"}
      </button>
      {state?.error && <p className="w-full text-sm text-[var(--color-coral)]">{state.error}</p>}
    </form>
  );
}

function ProfileRow({ profile }: { profile: Profile }) {
  const [label, setLabel] = useState(profile.activityLabel);
  const [hours, setHours] = useState(profile.hoursPerWeek ?? "");
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-2">
      <input value={label} onChange={(e) => setLabel(e.target.value)} className={`flex-1 ${inputCls}`} />
      <input
        value={hours}
        onChange={(e) => setHours(e.target.value)}
        type="number"
        min="0"
        step="0.01"
        placeholder="Std./Woche"
        className={`w-32 ${inputCls}`}
      />
      <button
        disabled={pending}
        onClick={() => startTransition(() => updateActivityProfileRow(profile.id, label, hours))}
        className="text-xs font-medium text-[var(--color-primary)] hover:underline disabled:opacity-50"
      >
        Speichern
      </button>
      <button
        disabled={pending}
        onClick={() => startTransition(() => deleteActivityProfileRow(profile.id))}
        className="text-xs font-medium text-[var(--color-coral)] hover:underline disabled:opacity-50"
      >
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
    <div className="mt-3 flex items-center gap-2 border-t border-[var(--color-border)] pt-3">
      <input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="Neue Komponente, z.B. Einzelzeit Kind"
        className={`flex-1 ${inputCls}`}
      />
      <input
        value={hours}
        onChange={(e) => setHours(e.target.value)}
        type="number"
        min="0"
        step="0.01"
        placeholder="Std./Woche (optional)"
        className={`w-32 ${inputCls}`}
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
        className="rounded-[var(--radius-control)] bg-[var(--color-primary)] px-3 py-1.5 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
      >
        Hinzufügen
      </button>
    </div>
  );
}
