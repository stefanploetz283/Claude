"use client";

import { useState } from "react";
import { CapacityChart, type HighlightRange } from "./capacity-chart";
import { WaitlistCard, type Suggestion } from "./waitlist-card";
import type { WeeklyCapacityBreakdown } from "@/lib/capacity";

export type EmployeeCapacityRow = {
  id: string;
  name: string;
  hasContractHours: boolean;
  points: WeeklyCapacityBreakdown[];
};

export type WaitlistItem = {
  entry: {
    id: string;
    clientName: string;
    authority: string | null;
    helpTypeName: string;
    requestedAt: Date;
    urgencyNote: string | null;
    waitingDays: number;
  };
  suggestion: Suggestion;
  defaultTotalHours: number | null;
  defaultDurationWeeks: number | null;
  defaultPhaseOutWeeks: number;
};

export function KapazitaetBoard({
  employees,
  helpTypeOrder,
  waitlistItems,
  employeeOptions,
  children,
}: {
  employees: EmployeeCapacityRow[];
  helpTypeOrder: { id: string; name: string }[];
  waitlistItems: WaitlistItem[];
  employeeOptions: { id: string; name: string }[];
  children?: React.ReactNode;
}) {
  const [highlight, setHighlight] = useState<HighlightRange>(null);

  return (
    <>
      <div className="flex flex-col gap-5 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-soft)]">
        <h2 className="text-sm font-semibold text-[var(--color-text)]">Auslastung je Fachkraft</h2>
        {employees.map((e) =>
          e.hasContractHours ? (
            <CapacityChart key={e.id} employeeId={e.id} points={e.points} title={e.name} helpTypeOrder={helpTypeOrder} highlightRange={highlight} />
          ) : (
            <p key={e.id} className="text-sm text-[var(--color-text-muted)]">
              <strong>{e.name}</strong>: keine Vertragsstunden hinterlegt (unter Mitarbeiter eintragen).
            </p>
          )
        )}
        {employees.length === 0 && <p className="text-sm text-[var(--color-text-muted)]">Keine aktiven Fachkräfte.</p>}
      </div>

      {children}

      <div className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-[var(--color-text)]">Warteliste ({waitlistItems.length}, längste Wartezeit zuerst)</h2>
        {waitlistItems.map(({ entry, suggestion, defaultTotalHours, defaultDurationWeeks, defaultPhaseOutWeeks }) => (
          <div
            key={entry.id}
            onMouseEnter={() => suggestion && setHighlight({ employeeId: suggestion.employeeId, fromWeek: suggestion.fromWeek, toWeek: suggestion.toWeek })}
            onMouseLeave={() => setHighlight(null)}
          >
            <WaitlistCard
              entry={entry}
              suggestion={suggestion}
              employees={employeeOptions}
              defaultTotalHours={defaultTotalHours}
              defaultDurationWeeks={defaultDurationWeeks}
              defaultPhaseOutWeeks={defaultPhaseOutWeeks}
            />
          </div>
        ))}
        {waitlistItems.length === 0 && <p className="text-sm text-[var(--color-text-muted)]">Warteliste ist leer.</p>}
      </div>
    </>
  );
}
