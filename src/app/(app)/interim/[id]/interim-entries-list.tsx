"use client";

import { useState, useTransition } from "react";
import { deleteInterimEntry, updateInterimEntry, clearUeberschneidungMarkierung, type Ueberschneidung } from "../actions";

export type InterimEntryRow = {
  id: string;
  date: string;
  dateISO: string;
  timeLabel: string;
  startTime: string;
  endTime: string;
  content: string;
  ueberschneidungBestaetigt: boolean;
};

const inputCls =
  "rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-bg)] px-2.5 py-1.5 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]";

export function InterimEntriesList({ caseId, entries }: { caseId: string; entries: InterimEntryRow[] }) {
  const [rowPending, startRowTransition] = useTransition();

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
          <EntryRow
            key={e.id}
            caseId={caseId}
            entry={e}
            rowPending={rowPending}
            onDelete={() => startRowTransition(() => deleteInterimEntry(e.id, caseId))}
            onClearMarkierung={() => startRowTransition(() => clearUeberschneidungMarkierung(e.id, caseId))}
          />
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
  rowPending,
  onDelete,
  onClearMarkierung,
}: {
  caseId: string;
  entry: InterimEntryRow;
  rowPending: boolean;
  onDelete: () => void;
  onClearMarkierung: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [date, setDate] = useState(entry.dateISO);
  const [startTime, setStartTime] = useState(entry.startTime);
  const [endTime, setEndTime] = useState(entry.endTime);
  const [content, setContent] = useState(entry.content);
  const [conflicts, setConflicts] = useState<Ueberschneidung[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savePending, startSaveTransition] = useTransition();

  const timeInvalid = Boolean(startTime && endTime && startTime >= endTime);
  const contentInvalid = content.trim().length === 0;

  function cancelEdit() {
    setDate(entry.dateISO);
    setStartTime(entry.startTime);
    setEndTime(entry.endTime);
    setContent(entry.content);
    setConflicts(null);
    setError(null);
    setEditing(false);
  }

  function save(bestaetigt: boolean) {
    setError(null);
    const fd = new FormData();
    fd.set("id", entry.id);
    fd.set("caseId", caseId);
    fd.set("date", date);
    fd.set("startTime", startTime);
    fd.set("endTime", endTime);
    fd.set("content", content);
    if (bestaetigt) fd.set("bestaetigt", "true");
    startSaveTransition(async () => {
      const result = await updateInterimEntry(undefined, fd);
      if (result?.conflicts) {
        setConflicts(result.conflicts);
        return;
      }
      if (result?.error) {
        setError(result.error);
        return;
      }
      setConflicts(null);
      setEditing(false);
    });
  }

  if (!editing) {
    return (
      <tr className="border-t border-[var(--color-border)]">
        <td className="px-5 py-3 whitespace-nowrap text-[var(--color-text-muted)]">{entry.date}</td>
        <td className="px-5 py-3 whitespace-nowrap text-[var(--color-text-muted)]">{entry.timeLabel}</td>
        <td className="px-5 py-3 text-[var(--color-text)]">
          {entry.ueberschneidungBestaetigt && (
            <span title="Zeitüberschneidung bestätigt - noch nicht behoben" className="mr-1.5 text-[var(--color-coral)]">
              ⚠
            </span>
          )}
          {entry.content}
        </td>
        <td className="px-5 py-3 text-right whitespace-nowrap">
          {entry.ueberschneidungBestaetigt && (
            <button
              disabled={rowPending}
              onClick={onClearMarkierung}
              className="mr-3 text-xs font-medium text-[var(--color-coral)] hover:underline disabled:opacity-50"
            >
              Markierung entfernen
            </button>
          )}
          <button onClick={() => setEditing(true)} className="text-xs font-medium text-[var(--color-primary)] hover:underline">
            Bearbeiten
          </button>
          <button
            disabled={rowPending}
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
        <div className="flex flex-col gap-2.5">
          <div className="flex flex-wrap items-start gap-2.5">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1.5">
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className={`${inputCls} ${timeInvalid ? "border-[var(--color-coral)]" : ""}`}
                />
                <span className="text-[var(--color-text-muted)]">–</span>
                <input
                  type="time"
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
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={3}
              className={`w-full ${inputCls} ${contentInvalid ? "border-[var(--color-coral)]" : ""}`}
            />
            {contentInvalid && <p className="text-xs text-[var(--color-coral)]">Inhalt darf nicht leer sein.</p>}
          </div>
          {error && <p className="text-xs text-[var(--color-coral)]">{error}</p>}

          {conflicts && (
            <div className="rounded-[var(--radius-control)] bg-[var(--color-warn-soft)] p-3">
              <p className="mb-1.5 text-xs font-semibold text-[var(--color-warn-text)]">⚠ Zeitüberschneidung erkannt</p>
              <ul className="flex flex-col gap-0.5 text-xs text-[var(--color-warn-text)]">
                {conflicts.map((c, i) => (
                  <li key={i}>
                    {c.ueberlappungMinuten} Minuten Überschneidung mit Fall {c.andererFallName}, {c.andererZeitraumLabel}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex items-center gap-2.5">
            {conflicts ? (
              <button
                disabled={savePending}
                onClick={() => save(true)}
                className="rounded-[var(--radius-control)] bg-[var(--color-coral)] px-3.5 py-1.5 text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
              >
                {savePending ? "Speichern…" : "Trotzdem speichern"}
              </button>
            ) : (
              <button
                disabled={savePending || timeInvalid || contentInvalid}
                onClick={() => save(false)}
                className="rounded-[var(--radius-control)] bg-[var(--color-primary)] px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
              >
                {savePending ? "Speichern…" : "Speichern"}
              </button>
            )}
            <button type="button" onClick={cancelEdit} disabled={savePending} className="text-xs font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
              Abbrechen
            </button>
          </div>
        </div>
      </td>
    </tr>
  );
}
