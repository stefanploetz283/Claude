import { format } from "date-fns";
import { de } from "date-fns/locale";
import type { SondertagRow } from "@/lib/stundenmodell";
import { cardCls } from "@/app/(app)/cases/case-ui";
import { IconCheck } from "@/app/(app)/interim/interim-icons";

export function TeamOverview({
  employees,
  sondertage,
}: {
  employees: { id: string; name: string; sondertagIds: string[] }[];
  sondertage: SondertagRow[];
}) {
  const cutoff = new Date().getTime() - 30 * 24 * 60 * 60 * 1000;
  const upcoming = sondertage
    .filter((s) => new Date(s.datum).getTime() >= cutoff)
    .sort((a, b) => new Date(a.datum).getTime() - new Date(b.datum).getTime())
    .slice(0, 8);

  return (
    <div className={cardCls}>
      <h2 className="mb-1 text-sm font-semibold text-[var(--color-text)]">Team-Gesamtansicht</h2>
      <p className="mb-3 text-sm text-[var(--color-text-muted)]">
        Wer ist an welchem Sondertag eingeplant – Spalten mit vielen Häkchen zeigen mögliche Kollisionen.
      </p>
      <div className="overflow-x-auto rounded-[var(--pros-r-sm)] border border-[var(--pros-border-strong)]">
        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--color-primary-soft)] text-[11px] font-bold tracking-wide text-[var(--color-primary)] uppercase">
            <tr>
              <th className="px-3 py-2">Mitarbeiter</th>
              {upcoming.map((s) => (
                <th key={s.id} className="px-3 py-2 whitespace-nowrap">
                  {s.name}
                  <br />
                  {format(new Date(s.datum), "dd.MM.", { locale: de })}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {employees.map((e) => (
              <tr key={e.id} className="border-t border-[var(--pros-border-default)] transition-colors hover:bg-[var(--pros-sage-pale)]/40">
                <td className="px-3 py-2 font-medium text-[var(--color-text)]">{e.name}</td>
                {upcoming.map((s) => (
                  <td key={s.id} className="px-3 py-2 text-center">
                    {e.sondertagIds.includes(s.id) && <IconCheck className="mx-auto text-[var(--color-primary)]" />}
                  </td>
                ))}
              </tr>
            ))}
            {employees.length === 0 && (
              <tr>
                <td colSpan={upcoming.length + 1} className="px-3 py-6 text-center text-[var(--color-text-muted)]">
                  Keine Fachkräfte.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {upcoming.length === 0 && <p className="p-3 text-sm text-[var(--color-text-muted)]">Keine anstehenden Sondertage.</p>}
      </div>
    </div>
  );
}
