"use client";

import { useState, useTransition, useActionState } from "react";
import { approveAbschlussbericht, requestAbschlussberichtCorrection } from "./actions";

export function AbschlussberichtReviewCard({
  caseId,
  clientName,
  helpTypeName,
  fallfuehrendeFachkraftName,
  submittedAt,
  text,
}: {
  caseId: string;
  clientName: string;
  helpTypeName: string;
  fallfuehrendeFachkraftName: string;
  submittedAt: string;
  text: string;
}) {
  const [pending, startTransition] = useTransition();
  const [showCorrection, setShowCorrection] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [state, formAction, correctionPending] = useActionState(requestAbschlussberichtCorrection, undefined);

  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-soft)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-[var(--color-text)]">{clientName} · Abschlussbericht</h3>
          <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
            {helpTypeName} · Ich-Perspektive: {fallfuehrendeFachkraftName} · Eingereicht am {submittedAt}
          </p>
        </div>
      </div>

      <div className={`mt-3 overflow-y-auto rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-bg)] p-4 text-sm whitespace-pre-wrap text-[var(--color-text)] ${expanded ? "max-h-[32rem]" : "max-h-40"}`}>
        {text}
      </div>
      <button onClick={() => setExpanded((v) => !v)} className="mt-1.5 text-xs font-medium text-[var(--color-primary)] hover:underline">
        {expanded ? "Einklappen" : "Vollständig anzeigen"}
      </button>

      <div className="mt-4 flex flex-wrap items-center gap-2.5">
        <button
          disabled={pending}
          onClick={() => startTransition(() => approveAbschlussbericht(caseId))}
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
          <textarea
            name="comment"
            required
            rows={3}
            placeholder="Was muss an dem Bericht korrigiert werden?"
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
