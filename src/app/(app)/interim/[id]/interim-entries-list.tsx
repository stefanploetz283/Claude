"use client";

import { useEffect, useRef, useState, useTransition, useActionState } from "react";
import { deleteInterimEntry, updateInterimEntry } from "../actions";

export type InterimEntryRow = {
  id: string;
  date: string;
  dateISO: string;
  timeLabel: string;
  startTime: string;
  endTime: string;
  content: string;
};

const inputCls =
  "rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-bg)] px-2.5 py-1.5 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]";

export function InterimEntriesList({ caseId, entries }: { caseId: string; entries: InterimEntryRow[] }) {
  const [deletePending, startDeleteTransition] = useTransition();

  return (
    <table className="w-full text-left text-sm">
      <thead className="bg-[var(--color-primary-soft)] text-[11px] font-bold tracking-wide text-[var(--color-primary)] uppercase">
        <tr>
          <th className="px-5 py-3">Datum</th>
          <th className="px-5 py-3">Zeit</th>
          <th className="px-5 py-3">Inhalt</th>
          <th className="px-5 py-3"></th>
        </tr>
      </thead>
      <tbody>
        {entries.map((e) => (
          <EntryRow key={e.id} caseId={caseId} entry={e} deletePending={deletePending} onDelete={() => startDeleteTransition(() => deleteInterimEntry(e.id, caseId))} />
        ))}
        {entries.length === 0 && (
          <tr>
            <td colSpan={4} className="px-4 py-10 text-center text-[var(--color-text-muted)]">
              Noch keine Einträge für diesen Fall.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}

function EntryRow({
  caseId,
  entry,
  deletePending,
  onDelete,
}: {
  caseId: string;
  entry: InterimEntryRow;
  deletePending: boolean;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [state, formAction, pending] = useActionState(updateInterimEntry, undefined);
  const [date, setDate] = useState(entry.dateISO);
  const [startTime, setStartTime] = useState(entry.startTime);
  const [endTime, setEndTime] = useState(entry.endTime);
  const [content, setContent] = useState(entry.content);

  // Bearbeitungszustand erst nach erfolgreichem Speichern schließen - bei einem Validierungsfehler vom
  // Server muss die Zeile offen bleiben, sonst geht die Eingabe stillschweigend verloren.
  const submittedRef = useRef(false);
  useEffect(() => {
    if (submittedRef.current && !pending) {
      submittedRef.current = false;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (!state?.error) setEditing(false);
    }
  }, [state, pending]);

  const timeInvalid = Boolean(startTime && endTime && startTime >= endTime);
  const contentInvalid = content.trim().length === 0;

  function cancelEdit() {
    setDate(entry.dateISO);
    setStartTime(entry.startTime);
    setEndTime(entry.endTime);
    setContent(entry.content);
    setEditing(false);
  }

  if (!editing) {
    return (
      <tr className="group border-t border-[var(--color-border)]">
        <td className="px-5 py-3 whitespace-nowrap text-[var(--color-text-muted)]">{entry.date}</td>
        <td className="px-5 py-3 whitespace-nowrap text-[var(--color-text-muted)]">{entry.timeLabel}</td>
        <td className="px-5 py-3 text-[var(--color-text)]">{entry.content}</td>
        <td className="px-5 py-3 text-right whitespace-nowrap">
          <button
            onClick={() => setEditing(true)}
            className="text-xs font-medium text-[var(--color-primary)] hover:underline"
          >
            Bearbeiten
          </button>
          <button
            disabled={deletePending}
            onClick={() => {
              if (confirm("Eintrag wirklich löschen?")) onDelete();
            }}
            className="ml-3 text-xs font-medium text-[var(--color-coral)] hover:underline disabled:opacity-50"
          >
            Löschen
          </button>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-t border-[var(--color-border)] bg-[var(--color-warn-soft)]/40">
      <td colSpan={4} className="px-5 py-3">
        <form
          action={(fd) => {
            submittedRef.current = true;
            formAction(fd);
          }}
          className="flex flex-col gap-2.5"
        >
          <input type="hidden" name="id" value={entry.id} />
          <input type="hidden" name="caseId" value={caseId} />
          <div className="flex flex-wrap items-start gap-2.5">
            <input type="date" name="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1.5">
                <input
                  type="time"
                  name="startTime"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className={`${inputCls} ${timeInvalid ? "border-[var(--color-coral)]" : ""}`}
                />
                <span className="text-[var(--color-text-muted)]">–</span>
                <input
                  type="time"
                  name="endTime"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className={`${inputCls} ${timeInvalid ? "border-[var(--color-coral)]" : ""}`}
                />
              </div>
              {timeInvalid && <p className="text-xs text-[var(--color-coral)]">Ende muss nach Beginn liegen.</p>}
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <textarea
              name="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={3}
              className={`w-full ${inputCls} ${contentInvalid ? "border-[var(--color-coral)]" : ""}`}
            />
            {contentInvalid && <p className="text-xs text-[var(--color-coral)]">Inhalt darf nicht leer sein.</p>}
          </div>
          {state?.error && <p className="text-xs text-[var(--color-coral)]">{state.error}</p>}
          <div className="flex items-center gap-2.5">
            <button
              type="submit"
              disabled={pending || timeInvalid || contentInvalid}
              className="rounded-[var(--radius-control)] bg-[var(--color-primary)] px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
            >
              {pending ? "Speichern…" : "Speichern"}
            </button>
            <button
              type="button"
              onClick={cancelEdit}
              disabled={pending}
              className="text-xs font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            >
              Abbrechen
            </button>
          </div>
        </form>
      </td>
    </tr>
  );
}
