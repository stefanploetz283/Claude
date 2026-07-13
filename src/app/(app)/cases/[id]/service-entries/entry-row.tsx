"use client";

import { useActionState, useState, useTransition } from "react";
import { format } from "date-fns";
import { updateServiceEntry, deleteServiceEntry } from "./actions";

const inputCls = "w-full rounded-md border border-black/15 px-2 py-1 text-sm";

type Entry = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  description: string;
  employeeName: string;
};

export function EntryRow({ entry, caseId, canEdit }: { entry: Entry; caseId: string; canEdit: boolean }) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const [state, formAction, formPending] = useActionState(updateServiceEntry, undefined);

  if (editing) {
    return (
      <tr className="border-t border-black/5 bg-amber-50/40">
        <td colSpan={5} className="px-4 py-3">
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
            <button type="submit" disabled={formPending} className="rounded-md bg-[var(--color-primary)] px-3 py-1 text-xs text-white">
              Speichern
            </button>
            <button type="button" onClick={() => setEditing(false)} className="rounded-md border border-black/15 px-3 py-1 text-xs">
              Abbrechen
            </button>
            {state?.error && <p className="w-full text-xs text-red-600">{state.error}</p>}
          </form>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-t border-black/5">
      <td className="px-4 py-2 whitespace-nowrap">{format(new Date(entry.date), "dd.MM.yyyy")}</td>
      <td className="px-4 py-2 whitespace-nowrap">
        {entry.startTime}–{entry.endTime} ({(entry.durationMinutes / 60).toFixed(2)} Std.)
      </td>
      <td className="px-4 py-2">{entry.description}</td>
      <td className="px-4 py-2 whitespace-nowrap text-black/50">{entry.employeeName}</td>
      {canEdit && (
        <td className="px-4 py-2 whitespace-nowrap text-right">
          <button onClick={() => setEditing(true)} className="mr-3 text-xs text-[var(--color-primary)] hover:underline">
            Bearbeiten
          </button>
          <button
            disabled={pending}
            onClick={() => {
              if (confirm("Eintrag wirklich löschen?")) {
                startTransition(() => deleteServiceEntry(entry.id, caseId));
              }
            }}
            className="text-xs text-[var(--color-danger)] hover:underline disabled:opacity-50"
          >
            Löschen
          </button>
        </td>
      )}
    </tr>
  );
}
