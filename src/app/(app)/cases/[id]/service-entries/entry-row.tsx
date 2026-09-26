"use client";

import { useActionState, useState, useTransition } from "react";
import { format } from "date-fns";
import { updateServiceEntry, deleteServiceEntry } from "./actions";

const inputCls = "w-full rounded-[var(--pros-r-sm)] border border-[var(--pros-border-strong)] bg-[var(--color-bg)] px-2.5 py-1.5 text-sm text-[var(--color-text)]";

type Entry = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  description: string;
  employeeName: string;
  activityLabel?: string | null;
  activityProfileId?: string | null;
};

export function EntryRow({
  entry,
  caseId,
  canEdit,
  activityOptions,
}: {
  entry: Entry;
  caseId: string;
  canEdit: boolean;
  activityOptions?: { id: string; label: string }[];
}) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const [state, formAction, formPending] = useActionState(updateServiceEntry, undefined);

  if (editing) {
    return (
      <tr className="border-t border-[var(--pros-border-default)] bg-[var(--pros-status-attention-bg)]/40">
        <td colSpan={5} className="px-5 py-3.5">
          <form
            action={async (fd) => {
              await formAction(fd);
              setEditing(false);
            }}
            className="flex flex-wrap items-end gap-2"
          >
            <input type="hidden" name="id" value={entry.id} />
            <input type="hidden" name="caseId" value={caseId} />
            <input name="date" type="date" defaultValue={entry.date} className={inputCls} />
            <input name="startTime" type="time" defaultValue={entry.startTime} className={inputCls} />
            <input name="endTime" type="time" defaultValue={entry.endTime} className={inputCls} />
            <input name="description" defaultValue={entry.description} className={`${inputCls} min-w-[16rem] flex-1`} />
            {activityOptions && activityOptions.length > 0 && (
              <select name="activityProfileId" defaultValue={entry.activityProfileId ?? ""} className={inputCls}>
                <option value="">Kategorie: –</option>
                {activityOptions.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            )}
            <button type="submit" disabled={formPending} className="rounded-[var(--pros-r-sm)] bg-[var(--color-primary)] px-3.5 py-1.5 text-xs font-semibold text-white transition-transform duration-[170ms] ease-[var(--pros-ease)] active:scale-[0.97]">
              Speichern
            </button>
            <button type="button" onClick={() => setEditing(false)} className="rounded-[var(--pros-r-sm)] border border-[var(--pros-border-strong)] px-3.5 py-1.5 text-xs font-medium text-[var(--color-text)] transition-transform duration-[170ms] ease-[var(--pros-ease)] active:scale-[0.97]">
              Abbrechen
            </button>
            {state?.error && <p className="w-full text-xs text-[var(--pros-status-critical-text)]">{state.error}</p>}
          </form>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-t border-[var(--pros-border-default)] transition-colors hover:bg-[var(--pros-sage-pale)]/40">
      <td className="px-3 py-3 whitespace-nowrap text-[var(--color-text)] xl:px-5">{format(new Date(entry.date), "dd.MM.yyyy")}</td>
      <td className="px-3 py-3 text-[var(--color-text)] xl:px-5 xl:whitespace-nowrap">
        {entry.startTime}–{entry.endTime} ({(entry.durationMinutes / 60).toFixed(2)} Std.)
      </td>
      <td className="px-3 py-3 text-[var(--color-text)] xl:px-5">
        {entry.description}
        {entry.activityLabel && (
          <span className="ml-2 rounded-full bg-[var(--color-primary-soft)] px-2 py-0.5 text-xs font-medium text-[var(--color-primary)]">
            {entry.activityLabel}
          </span>
        )}
      </td>
      <td className="px-3 py-3 text-[var(--color-text-muted)] xl:px-5 xl:whitespace-nowrap">{entry.employeeName}</td>
      {canEdit && (
        <td className="px-3 py-3 text-right xl:px-5 xl:whitespace-nowrap">
          {/* Bis xl untereinander: so bleiben Bearbeiten/Löschen ohne Horizontal-Scroll erreichbar. */}
          <div className="flex flex-col items-end gap-1 xl:flex-row xl:justify-end xl:gap-3">
          <button onClick={() => setEditing(true)} className="text-xs font-medium text-[var(--color-primary)] hover:underline">
            Bearbeiten
          </button>
          <button
            disabled={pending}
            onClick={() => {
              if (confirm("Eintrag wirklich löschen?")) {
                startTransition(() => deleteServiceEntry(entry.id, caseId));
              }
            }}
            className="text-xs font-medium text-[var(--pros-status-critical-text)] hover:underline disabled:opacity-50"
          >
            Löschen
          </button>
          </div>
        </td>
      )}
    </tr>
  );
}
