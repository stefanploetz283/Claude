"use client";

import { useEffect, useRef, useState, useTransition, useActionState } from "react";
import { approveMonth, requestCorrection, adminUpdateServiceEntry, getChangeHistory, type ChangeHistoryEntry } from "./actions";

export type ReviewEntry = {
  id: string;
  dateISO: string;
  dateLabel: string;
  startTime: string;
  endTime: string;
  durationHours: number;
  description: string;
};

const FIELD_LABELS: Record<ChangeHistoryEntry["field"], string> = {
  DATUM: "Datum",
  ZEIT: "Zeit",
  BEMERKUNG: "Bemerkung",
};

export function ApprovalReviewCard({
  caseId,
  year,
  month,
  monthLabel,
  clientName,
  helpTypeName,
  employeeName,
  submittedAt,
  totalHours,
  lastEditedByName,
  lastEditedAtLabel,
  entries,
}: {
  caseId: string;
  year: number;
  month: number;
  monthLabel: string;
  clientName: string;
  helpTypeName: string;
  employeeName: string;
  submittedAt: string;
  totalHours: number;
  lastEditedByName: string | null;
  lastEditedAtLabel: string | null;
  entries: ReviewEntry[];
}) {
  const [pending, startTransition] = useTransition();
  const [showCorrection, setShowCorrection] = useState(false);
  const [state, formAction, correctionPending] = useActionState(requestCorrection, undefined);

  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<ChangeHistoryEntry[] | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [flash, setFlash] = useState(false);
  const prevTotalRef = useRef(totalHours);
  useEffect(() => {
    if (prevTotalRef.current !== totalHours) {
      setFlash(true);
      prevTotalRef.current = totalHours;
      const t = setTimeout(() => setFlash(false), 700);
      return () => clearTimeout(t);
    }
  }, [totalHours]);

  async function openHistory() {
    setShowHistory(true);
    setHistoryLoading(true);
    const rows = await getChangeHistory(caseId, year, month);
    setHistory(rows);
    setHistoryLoading(false);
  }

  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-soft)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-[var(--color-text)]">
            {clientName} · {monthLabel}
          </h3>
          <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
            {helpTypeName} · Fachkraft: {employeeName} · Eingereicht am {submittedAt}
          </p>
          {lastEditedByName && (
            <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
              Zuletzt bearbeitet von {lastEditedByName} am {lastEditedAtLabel}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={openHistory}
            aria-label="Änderungshistorie anzeigen"
            title="Änderungshistorie anzeigen"
            className="flex h-7 w-7 items-center justify-center rounded-full text-[var(--color-text-muted)] transition hover:bg-[var(--color-bg)] hover:text-[var(--color-primary)]"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9" />
              <polyline points="12 7 12 12 15.5 14" />
            </svg>
          </button>
          <span
            className={`rounded-full bg-[var(--color-primary-soft)] px-3 py-1 text-xs font-semibold text-[var(--color-primary)] transition ${
              flash ? "ring-2 ring-[var(--color-gold)]" : ""
            }`}
          >
            {totalHours.toFixed(2)} Std.
          </span>
        </div>
      </div>

      <div className="mt-3 max-h-80 overflow-y-auto rounded-[var(--radius-control)] border border-[var(--color-border)]">
        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--color-bg)] text-xs uppercase text-[var(--color-text-muted)]">
            <tr>
              <th className="px-3 py-2">Datum</th>
              <th className="px-3 py-2">Zeit</th>
              <th className="px-3 py-2">Bemerkung</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <EntryRow key={e.id} caseId={caseId} year={year} month={month} entry={e} />
            ))}
            {entries.length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-4 text-center text-[var(--color-text-muted)]">
                  Keine Einträge in diesem Zeitraum.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2.5">
        <button
          disabled={pending}
          onClick={() => startTransition(() => approveMonth(caseId, year, month))}
          className="rounded-[var(--radius-control)] bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white shadow-[var(--shadow-soft)] transition hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
        >
          Freigeben
        </button>
        <button
          disabled={pending}
          onClick={() => setShowCorrection((v) => !v)}
          className="rounded-[var(--radius-control)] border border-[var(--color-coral)] px-4 py-2 text-sm font-semibold text-[var(--color-coral)] transition hover:bg-[var(--color-coral)]/10 disabled:opacity-50"
        >
          Korrektur anfordern
        </button>
      </div>

      {showCorrection && (
        <form action={formAction} className="mt-3 flex flex-col gap-2">
          <input type="hidden" name="caseId" value={caseId} />
          <input type="hidden" name="year" value={year} />
          <input type="hidden" name="month" value={month} />
          <textarea
            name="comment"
            required
            rows={3}
            placeholder="Was muss die Fachkraft korrigieren?"
            className="w-full rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3.5 py-2.5 text-sm text-[var(--color-text)] outline-none transition focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-soft)]"
          />
          <button
            type="submit"
            disabled={correctionPending}
            className="self-start rounded-[var(--radius-control)] bg-[var(--color-coral)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {correctionPending ? "Wird gesendet…" : "Korrektur senden"}
          </button>
          {state?.error && <p className="text-sm text-[var(--color-coral)]">{state.error}</p>}
        </form>
      )}

      {showHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowHistory(false)}>
          <div
            className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-[var(--radius-card)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-soft)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-sm font-semibold text-[var(--color-text)]">Änderungshistorie · {clientName}</h4>
              <button onClick={() => setShowHistory(false)} className="text-[var(--color-text-muted)] hover:text-[var(--color-text)]" aria-label="Schließen">
                ✕
              </button>
            </div>
            {historyLoading && <p className="text-sm text-[var(--color-text-muted)]">Wird geladen…</p>}
            {!historyLoading && history && history.length === 0 && (
              <p className="text-sm text-[var(--color-text-muted)]">Noch keine Änderungen protokolliert.</p>
            )}
            {!historyLoading && history && history.length > 0 && (
              <ul className="flex flex-col gap-3 text-sm">
                {history.map((h) => (
                  <li key={h.id} className="rounded-[var(--radius-control)] border border-[var(--color-border)] p-3">
                    <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)]">
                      <span className="font-semibold text-[var(--color-primary)]">{FIELD_LABELS[h.field]}</span>
                      <span>
                        {h.changedByName} · {h.changedAt}
                      </span>
                    </div>
                    <p className="mt-1.5 text-[var(--color-text)]">
                      <span className="text-[var(--color-coral)] line-through">{h.oldValue}</span>
                      {" → "}
                      <span className="font-medium">{h.newValue}</span>
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function EntryRow({ caseId, year, month, entry }: { caseId: string; year: number; month: number; entry: ReviewEntry }) {
  const [editing, setEditing] = useState(false);
  const [state, formAction, pending] = useActionState(adminUpdateServiceEntry, undefined);
  const [date, setDate] = useState(entry.dateISO);
  const [startTime, setStartTime] = useState(entry.startTime);
  const [endTime, setEndTime] = useState(entry.endTime);
  const [description, setDescription] = useState(entry.description);

  // Bearbeitungszustand erst nach erfolgreichem Speichern schließen - bei einem Validierungsfehler vom
  // Server (state.error) muss die Zeile offen bleiben, sonst geht die Eingabe des Nutzers stillschweigend
  // verloren und die Fehlermeldung verschwindet sofort mit.
  const submittedRef = useRef(false);
  useEffect(() => {
    if (submittedRef.current && !pending) {
      submittedRef.current = false;
      // Reagiert auf das Ergebnis einer externen Server-Action, nicht auf Render-Ableitung.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (!state?.error) setEditing(false);
    }
  }, [state, pending]);

  const timeInvalid = Boolean(startTime && endTime && startTime >= endTime);
  const descriptionInvalid = description.trim().length === 0;

  function cancelEdit() {
    setDate(entry.dateISO);
    setStartTime(entry.startTime);
    setEndTime(entry.endTime);
    setDescription(entry.description);
    setEditing(false);
  }

  if (!editing) {
    return (
      <tr className="group border-t border-[var(--color-border)]">
        <td className="px-3 py-2 whitespace-nowrap text-[var(--color-text-muted)]">{entry.dateLabel}</td>
        <td className="px-3 py-2 whitespace-nowrap text-[var(--color-text-muted)]">
          {entry.startTime}–{entry.endTime}
        </td>
        <td className="px-3 py-2 text-[var(--color-text)]">{entry.description}</td>
        <td className="px-3 py-2 text-right">
          <button
            onClick={() => setEditing(true)}
            aria-label="Bearbeiten"
            title="Bearbeiten"
            className="text-[var(--color-text-muted)] opacity-0 transition group-hover:opacity-100 hover:text-[var(--color-primary)]"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
            </svg>
          </button>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-t border-[var(--color-border)] bg-[var(--color-warn-soft)]/40">
      <td colSpan={4} className="px-3 py-3">
        <form
          action={(fd) => {
            submittedRef.current = true;
            formAction(fd);
          }}
          className="flex flex-col gap-2.5"
        >
          <input type="hidden" name="id" value={entry.id} />
          <input type="hidden" name="caseId" value={caseId} />
          <input type="hidden" name="year" value={year} />
          <input type="hidden" name="month" value={month} />
          <div className="flex flex-wrap items-start gap-2.5">
            <input
              type="date"
              name="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-bg)] px-2.5 py-1.5 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]"
            />
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1.5">
                <input
                  type="time"
                  name="startTime"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className={`rounded-[var(--radius-control)] border px-2.5 py-1.5 text-sm text-[var(--color-text)] outline-none ${
                    timeInvalid ? "border-[var(--color-coral)]" : "border-[var(--color-border)] focus:border-[var(--color-primary)]"
                  } bg-[var(--color-bg)]`}
                />
                <span className="text-[var(--color-text-muted)]">–</span>
                <input
                  type="time"
                  name="endTime"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className={`rounded-[var(--radius-control)] border px-2.5 py-1.5 text-sm text-[var(--color-text)] outline-none ${
                    timeInvalid ? "border-[var(--color-coral)]" : "border-[var(--color-border)] focus:border-[var(--color-primary)]"
                  } bg-[var(--color-bg)]`}
                />
              </div>
              {timeInvalid && <p className="text-xs text-[var(--color-coral)]">Ende muss nach Beginn liegen.</p>}
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <textarea
              name="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className={`w-full rounded-[var(--radius-control)] border px-3 py-2 text-sm text-[var(--color-text)] outline-none ${
                descriptionInvalid ? "border-[var(--color-coral)]" : "border-[var(--color-border)] focus:border-[var(--color-primary)]"
              } bg-[var(--color-bg)]`}
            />
            {descriptionInvalid && <p className="text-xs text-[var(--color-coral)]">Bemerkung darf nicht leer sein.</p>}
          </div>
          {state?.error && <p className="text-xs text-[var(--color-coral)]">{state.error}</p>}
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={pending || timeInvalid || descriptionInvalid}
              aria-label="Speichern"
              title="Speichern"
              className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-primary)] text-white transition hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </button>
            <button
              type="button"
              onClick={cancelEdit}
              disabled={pending}
              aria-label="Abbrechen"
              title="Abbrechen"
              className="flex h-7 w-7 items-center justify-center rounded-full border border-[var(--color-border)] text-[var(--color-text-muted)] transition hover:bg-[var(--color-bg)]"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </form>
      </td>
    </tr>
  );
}
