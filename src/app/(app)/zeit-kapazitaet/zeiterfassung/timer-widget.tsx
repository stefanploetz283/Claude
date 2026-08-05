"use client";

import { useActionState, useEffect, useState } from "react";
import { startTimer, stopTimer } from "./actions";

type CaseOption = { id: string; label: string };

const ACTIVITY_LABELS: Record<string, string> = {
  VERWALTUNG: "Verwaltung",
  FAHRZEITEN: "Fahrzeiten",
  SONSTIGES: "Sonstiges",
};

export function TimerWidget({
  cases,
  running,
}: {
  cases: CaseOption[];
  running: { startTime: string; caseLabel: string | null; generalActivity: string | null } | null;
}) {
  const [startState, startAction, startPending] = useActionState(startTimer, undefined);
  const [assignmentType, setAssignmentType] = useState<"case" | "general">("general");
  const [elapsed, setElapsed] = useState("00:00:00");

  useEffect(() => {
    if (!running) return;
    const start = new Date(running.startTime).getTime();
    const update = () => {
      const diff = Math.max(0, Date.now() - start);
      const h = String(Math.floor(diff / 3600000)).padStart(2, "0");
      const m = String(Math.floor((diff % 3600000) / 60000)).padStart(2, "0");
      const s = String(Math.floor((diff % 60000) / 1000)).padStart(2, "0");
      setElapsed(`${h}:${m}:${s}`);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [running]);

  if (running) {
    return (
      <div className="flex items-center justify-between rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-soft)]">
        <div>
          <p className="text-xs font-medium text-[var(--color-text-muted)]">Läuft seit {new Date(running.startTime).toLocaleTimeString("de-DE")}</p>
          <p className="text-2xl font-bold tabular-nums text-[var(--color-primary)]">{elapsed}</p>
          <p className="text-sm text-[var(--color-text-muted)]">{running.caseLabel ?? ACTIVITY_LABELS[running.generalActivity ?? ""] ?? "–"}</p>
        </div>
        <form action={() => stopTimer()}>
          <button type="submit" className="rounded-[var(--radius-control)] bg-[var(--color-coral)] px-5 py-2.5 text-sm font-semibold text-white shadow-[var(--shadow-soft)] transition hover:brightness-95">
            Stopp
          </button>
        </form>
      </div>
    );
  }

  return (
    <form action={startAction} className="flex flex-wrap items-end gap-3 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-soft)]">
      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium text-[var(--color-text-muted)]">Zuordnung</span>
        <div className="flex gap-3 text-sm">
          <label className="flex items-center gap-1">
            <input type="radio" name="assignmentType" value="general" checked={assignmentType === "general"} onChange={() => setAssignmentType("general")} />
            Allgemeine Tätigkeit
          </label>
          <label className="flex items-center gap-1">
            <input type="radio" name="assignmentType" value="case" checked={assignmentType === "case"} onChange={() => setAssignmentType("case")} />
            Fall
          </label>
        </div>
      </div>

      {assignmentType === "general" ? (
        <select name="generalActivity" className="rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3.5 py-2.5 text-sm text-[var(--color-text)]">
          <option value="VERWALTUNG">Verwaltung</option>
          <option value="FAHRZEITEN">Fahrzeiten</option>
          <option value="SONSTIGES">Sonstiges</option>
        </select>
      ) : (
        <select name="caseId" className="rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3.5 py-2.5 text-sm text-[var(--color-text)]">
          {cases.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      )}

      <button
        type="submit"
        disabled={startPending}
        className="rounded-[var(--radius-control)] bg-[var(--color-primary)] px-5 py-2.5 text-sm font-semibold text-white shadow-[var(--shadow-soft)] transition hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
      >
        {startPending ? "Start…" : "Start"}
      </button>
      {startState?.error && <p className="w-full text-sm text-[var(--color-coral)]">{startState.error}</p>}
    </form>
  );
}
