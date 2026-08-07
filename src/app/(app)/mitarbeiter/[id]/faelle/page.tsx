import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/rbac";

const STATUS_LABELS: Record<string, string> = { ACTIVE: "Aktiv", PAUSED: "Pausiert", COMPLETED: "Abgeschlossen" };

export default async function MitarbeiterFaellePage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;

  const employee = await prisma.user.findUnique({ where: { id } });
  if (!employee) notFound();

  const cases = await prisma.case.findMany({
    where: { OR: [{ assignedEmployeeId: id }, { substituteEmployeeId: id }] },
    include: { client: true, helpType: true },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-[var(--color-text)]">Fälle · {employee.name}</h1>
        <p className="mt-1 text-sm text-black/60">Zugeteilte und vertretene Fälle.</p>
      </div>

      <div className="overflow-x-auto rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-soft)]">
        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--color-primary-soft)] text-xs uppercase text-[var(--color-primary)]">
            <tr>
              <th className="px-4 py-2.5">Klient</th>
              <th className="px-4 py-2.5">Hilfeart</th>
              <th className="px-4 py-2.5">Rolle</th>
              <th className="px-4 py-2.5">Status</th>
              <th className="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {cases.map((c) => (
              <tr key={c.id} className="border-t border-[var(--color-border)]">
                <td className="px-4 py-2.5 font-medium text-[var(--color-text)]">
                  {c.client.lastName}, {c.client.firstName}
                </td>
                <td className="px-4 py-2.5 text-[var(--color-text-muted)]">{c.helpType.name}</td>
                <td className="px-4 py-2.5 text-[var(--color-text-muted)]">{c.assignedEmployeeId === id ? "Zuständig" : "Vertretung"}</td>
                <td className="px-4 py-2.5 text-[var(--color-text-muted)]">{STATUS_LABELS[c.status]}</td>
                <td className="px-4 py-2.5 text-right">
                  <Link href={`/cases/${c.id}`} className="text-xs font-medium text-[var(--color-primary)] hover:underline">
                    Öffnen
                  </Link>
                </td>
              </tr>
            ))}
            {cases.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-[var(--color-text-muted)]">
                  Keine Fälle zugeteilt.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
