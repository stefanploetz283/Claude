"use client";

import { useState, useTransition, useActionState } from "react";
import { approveMonth, requestCorrection } from "./actions";

export type ReviewEntry = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  description: string;
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
  entries: ReviewEntry[];
}) {
  const [pending, startTransition] = useTransition();
  const [showCorrection, setShowCorrection] = useState(false);
  const [state, formAction, correctionPending] = useActionState(requestCorrection, undefined);

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
        </div>
        <span className="rounded-full bg-[var(--color-primary-soft)] px-3 py-1 text-xs font-semibold text-[var(--color-primary)]">
          {totalHours.toFixed(2)} Std.
        </span>
      </div>

      <div className="mt-3 max-h-64 overflow-y-auto rounded-[var(--radius-control)] border border-[var(--color-border)]">
        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--color-bg)] text-xs uppercase text-[var(--color-text-muted)]">
            <tr>
              <th className="px-3 py-2">Datum</th>
              <th className="px-3 py-2">Zeit</th>
              <th className="px-3 py-2">Bemerkung</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id} className="border-t border-[var(--color-border)]">
                <td className="px-3 py-2 whitespace-nowrap text-[var(--color-text-muted)]">{e.date}</td>
                <td className="px-3 py-2 whitespace-nowrap text-[var(--color-text-muted)]">
                  {e.startTime}–{e.endTime}
                </td>
                <td className="px-3 py-2 text-[var(--color-text)]">{e.description}</td>
              </tr>
            ))}
            {entries.length === 0 && (
              <tr>
                <td colSpan={3} className="px-3 py-4 text-center text-[var(--color-text-muted)]">
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
    </div>
  );
}
