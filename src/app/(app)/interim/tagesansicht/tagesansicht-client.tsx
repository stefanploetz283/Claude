"use client";

import { useEffect, useState, useTransition } from "react";
import { getTagesUebersicht, type TagesEintrag } from "../actions";
import { toDateInputValue } from "@/lib/date";
import { inputCls, cardCls } from "../interim-ui";
import { IconWarnTriangle } from "../interim-icons";

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
              className={`rounded-[var(--pros-r-md)] border p-4 shadow-[var(--pros-shadow)] transition-[transform,box-shadow] duration-[170ms] ease-[var(--pros-ease)] hover:-translate-y-0.5 hover:shadow-[var(--pros-shadow-hover)] ${
                e.ueberschneidung
                  ? "border-[var(--pros-status-critical-text)] bg-[var(--pros-status-critical-bg)]"
                  : "border-[var(--pros-border-strong)] bg-[var(--color-surface)]"
              }`}
            >
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="font-semibold text-[var(--color-text)]">
                  {e.startTime}–{e.endTime} Uhr
                </span>
                <span className="text-[var(--color-text-muted)]">·</span>
                <span className="font-medium text-[var(--color-primary)]">{e.fallName}</span>
                {e.ueberschneidung && (
                  <span className="ml-auto inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--pros-status-critical-text)]">
                    <IconWarnTriangle /> Überschneidung
                  </span>
                )}
              </div>
              <p className="mt-1.5 text-sm text-[var(--color-text)]">{e.content}</p>
            </div>
          ))}
          {entries.length === 0 && <p className={`${cardCls} text-sm text-[var(--color-text-muted)]`}>Keine Einträge an diesem Tag.</p>}
        </div>
      )}
    </div>
  );
}
