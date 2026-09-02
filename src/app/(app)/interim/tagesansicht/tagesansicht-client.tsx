"use client";

import { useEffect, useState, useTransition } from "react";
import { getTagesUebersicht, type TagesEintrag } from "../actions";
import { toDateInputValue } from "@/lib/date";

const inputCls =
  "rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3.5 py-2.5 text-sm text-[var(--color-text)] outline-none transition focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-soft)]";

export function TagesansichtClient() {
  const [date, setDate] = useState(toDateInputValue(new Date()));
  const [entries, setEntries] = useState<TagesEintrag[]>([]);
  const [pending, startTransition] = useTransition();

  function load(d: string) {
    startTransition(async () => {
      setEntries(await getTagesUebersicht(d));
    });
  }

  useEffect(() => {
    load(date);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- nur beim ersten Mount, danach über onChange
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <input
        type="date"
        value={date}
        onChange={(e) => {
          setDate(e.target.value);
          load(e.target.value);
        }}
        className={`max-w-xs ${inputCls}`}
      />

      {pending && <p className="text-sm text-[var(--color-text-muted)]">Wird geladen…</p>}

      {!pending && (
        <div className="flex flex-col gap-2">
          {entries.map((e) => (
            <div
              key={e.id}
              className={`rounded-[var(--radius-card)] border p-4 shadow-[var(--shadow-soft)] ${
                e.ueberschneidung ? "border-[var(--color-coral)] bg-[var(--color-warn-soft)]" : "border-[var(--color-border)] bg-[var(--color-surface)]"
              }`}
            >
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="font-semibold text-[var(--color-text)]">
                  {e.startTime}–{e.endTime} Uhr
                </span>
                <span className="text-[var(--color-text-muted)]">·</span>
                <span className="font-medium text-[var(--color-primary)]">{e.fallName}</span>
                {e.ueberschneidung && <span className="ml-auto text-xs font-semibold text-[var(--color-coral)]">⚠ Überschneidung</span>}
              </div>
              <p className="mt-1.5 text-sm text-[var(--color-text)]">{e.content}</p>
            </div>
          ))}
          {entries.length === 0 && (
            <p className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 text-sm text-[var(--color-text-muted)]">
              Keine Einträge an diesem Tag.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
