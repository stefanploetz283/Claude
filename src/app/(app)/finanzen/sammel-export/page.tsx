import { requireAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { toDateInputValue } from "@/lib/date";
import { SelectAllCheckbox } from "./select-all";
import { cardCls, inputCls, labelCls, buttonPrimaryCls } from "@/app/(app)/cases/case-ui";

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
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-primary)]">Sammel-Export</h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          Leistungsnachweise mehrerer Fälle gebündelt exportieren, z.B. für die eigene Buchhaltung oder den Steuerberater.
        </p>
      </div>

      <form action="/api/reports/export" method="post" className="flex flex-col gap-5">
        <div className={cardCls}>
          <h2 className="mb-3 text-sm font-semibold text-[var(--color-text)]">Fälle auswählen</h2>
          <div className="flex flex-col gap-2 text-sm">
            <SelectAllCheckbox />
            <div className="grid max-h-80 grid-cols-1 gap-1 overflow-y-auto border-t border-[var(--pros-border-default)] pt-2 sm:grid-cols-2">
              {cases.map((c) => (
                <label key={c.id} className="flex items-center gap-2 text-[var(--color-text)]">
                  <input type="checkbox" name="caseIds" value={c.id} className="case-checkbox" />
                  {c.client.lastName}, {c.client.firstName} – {c.helpType.name}
                </label>
              ))}
              {cases.length === 0 && <p className="text-[var(--color-text-muted)]">Keine Fälle vorhanden.</p>}
            </div>
          </div>
        </div>

        <div className={`flex flex-wrap items-end gap-4 ${cardCls}`}>
          <label className="flex flex-col gap-1">
            <span className={labelCls}>Von</span>
            <input name="from" type="date" defaultValue={firstOfMonth} className={inputCls} />
          </label>
          <label className="flex flex-col gap-1">
            <span className={labelCls}>Bis</span>
            <input name="to" type="date" defaultValue={today} className={inputCls} />
          </label>
          <label className="flex flex-col gap-1">
            <span className={labelCls}>Format</span>
            <select name="format" className={inputCls}>
              <option value="excel">Excel (.xlsx)</option>
              <option value="pdf">PDF</option>
            </select>
          </label>
          <button type="submit" className={buttonPrimaryCls}>
            Exportieren
          </button>
        </div>
      </form>
    </div>
  );
}
