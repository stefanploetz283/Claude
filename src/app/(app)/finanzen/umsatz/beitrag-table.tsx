"use client";

import { useState } from "react";
import type { MitarbeiterBeitrag } from "@/lib/umsatz";

type SortKey = "employeeName" | "flsStunden" | "beitragEuro" | "anteilProzent";

const COLUMNS: { key: SortKey; label: string; align?: "right" }[] = [
  { key: "employeeName", label: "Mitarbeiter" },
  { key: "flsStunden", label: "FLS-Std.", align: "right" },
  { key: "beitragEuro", label: "Beitrag", align: "right" },
  { key: "anteilProzent", label: "Anteil", align: "right" },
];

export function BeitragTable({ beitraege }: { beitraege: MitarbeiterBeitrag[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("beitragEuro");
  const [sortDesc, setSortDesc] = useState(true);

  function toggleSort(key: SortKey) {
    if (key === sortKey) setSortDesc((d) => !d);
    else {
      setSortKey(key);
      setSortDesc(true);
    }
  }

  const sorted = [...beitraege].sort((a, b) => {
    const av = a[sortKey];
    const bv = b[sortKey];
    const cmp = typeof av === "string" ? av.localeCompare(bv as string) : (av as number) - (bv as number);
    return sortDesc ? -cmp : cmp;
  });

  return (
    <div className="overflow-x-auto rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-soft)]">
      <table className="w-full text-left text-sm">
        <thead className="bg-[var(--color-primary-soft)] text-[11px] font-bold tracking-wide text-[var(--color-primary)] uppercase">
          <tr>
            {COLUMNS.map((col) => (
              <th key={col.key} className={`px-5 py-3 ${col.align === "right" ? "text-right" : ""}`}>
                <button onClick={() => toggleSort(col.key)} className="inline-flex items-center gap-1 hover:underline">
                  {col.label}
                  {sortKey === col.key && <span>{sortDesc ? "↓" : "↑"}</span>}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((b) => (
            <tr key={b.employeeId} className="border-t border-[var(--color-border)]">
              <td className="px-5 py-3 text-[var(--color-text)]">{b.employeeName}</td>
              <td className="px-5 py-3 text-right text-[var(--color-text)]">{b.flsStunden.toFixed(1)}</td>
              <td className="px-5 py-3 text-right font-semibold text-[var(--color-text)]">
                {b.beitragEuro.toLocaleString("de-DE", { style: "currency", currency: "EUR" })}
              </td>
              <td className="px-5 py-3 text-right text-[var(--color-text-muted)]">{b.anteilProzent.toFixed(1)} %</td>
            </tr>
          ))}
          {sorted.length === 0 && (
            <tr>
              <td colSpan={4} className="px-5 py-8 text-center text-[var(--color-text-muted)]">
                Keine dokumentierten FLS-Stunden im gewählten Zeitraum.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
