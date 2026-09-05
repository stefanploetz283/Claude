import { prisma } from "@/lib/prisma";
import { requireAdminOrVerwaltung } from "@/lib/rbac";
import { RaumVerwaltung } from "./raum-verwaltung";

export default async function RaeumePage() {
  await requireAdminOrVerwaltung();
  const raeume = await prisma.raum.findMany({ orderBy: [{ aktiv: "desc" }, { standort: "asc" }, { name: "asc" }] });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-primary)]">Räume</h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          Praxisräume anlegen, umbenennen und deaktivieren. Deaktivierte Räume bleiben in der Historie vergangener Termine sichtbar.
        </p>
      </div>
      <RaumVerwaltung
        raeume={raeume.map((r) => ({ id: r.id, name: r.name, standort: r.standort, aktiv: r.aktiv }))}
      />
    </div>
  );
}
