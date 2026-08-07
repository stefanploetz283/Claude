import { requireAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { toDateInputValue } from "@/lib/date";
import { SelectAllCheckbox } from "./select-all";

// Bulk-Export für Jugendamt/Steuerberater, bewusst kein Werkzeug für einzelne Fachkräfte - deshalb nur
// noch über die Admin-Seitenleiste erreichbar.
export default async function ReportsPage() {
  await requireAdmin();

  const cases = await prisma.case.findMany({
    where: { archived: false },
    include: { client: true, helpType: true },
    orderBy: [{ client: { lastName: "asc" } }],
  });

  const now = new Date();
  const firstOfMonth = toDateInputValue(new Date(now.getFullYear(), now.getMonth(), 1));
  const today = toDateInputValue(now);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-[var(--color-text)]">Sammel-Export</h1>
        <p className="mt-1 text-sm text-black/60">
          Leistungsnachweise mehrerer Fälle gebündelt exportieren, z.B. für die eigene Buchhaltung oder den Steuerberater.
        </p>
      </div>

      <form action="/api/reports/export" method="post" className="flex flex-col gap-5">
        <div className="rounded-lg border border-black/10 bg-white p-5">
          <h2 className="mb-3 text-sm font-semibold text-[var(--color-text)]">Fälle auswählen</h2>
          <div className="flex flex-col gap-2 text-sm">
            <SelectAllCheckbox />
            <div className="grid max-h-80 grid-cols-1 gap-1 overflow-y-auto border-t border-black/5 pt-2 sm:grid-cols-2">
              {cases.map((c) => (
                <label key={c.id} className="flex items-center gap-2">
                  <input type="checkbox" name="caseIds" value={c.id} className="case-checkbox" />
                  {c.client.lastName}, {c.client.firstName} – {c.helpType.name}
                </label>
              ))}
              {cases.length === 0 && <p className="text-black/40">Keine Fälle vorhanden.</p>}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-4 rounded-lg border border-black/10 bg-white p-5">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs font-medium text-black/60">Von</span>
            <input name="from" type="date" defaultValue={firstOfMonth} className="rounded-md border border-black/15 px-3 py-1.5 text-sm" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs font-medium text-black/60">Bis</span>
            <input name="to" type="date" defaultValue={today} className="rounded-md border border-black/15 px-3 py-1.5 text-sm" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs font-medium text-black/60">Format</span>
            <select name="format" className="rounded-md border border-black/15 px-3 py-1.5 text-sm">
              <option value="excel">Excel (.xlsx)</option>
              <option value="pdf">PDF</option>
            </select>
          </label>
          <button
            type="submit"
            className="rounded-md bg-[var(--color-primary)] px-5 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            Exportieren
          </button>
        </div>
      </form>
    </div>
  );
}
