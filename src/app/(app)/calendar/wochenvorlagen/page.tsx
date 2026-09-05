import { prisma } from "@/lib/prisma";
import { requireAdminOrVerwaltung } from "@/lib/rbac";
import { SLOT_VORLAUF_WOCHEN } from "@/lib/termine/slot-generierung";
import { WochenvorlagenVerwaltung } from "./wochenvorlagen-verwaltung";

export default async function WochenvorlagenPage() {
  await requireAdminOrVerwaltung();

  const [mitarbeiterinnen, vorlagen, raeume] = await Promise.all([
    prisma.user.findMany({ where: { role: { in: ["EMPLOYEE", "ADMIN"] }, active: true }, orderBy: { name: "asc" } }),
    prisma.terminWochenvorlage.findMany({ orderBy: [{ employeeId: "asc" }, { wochentag: "asc" }, { startZeit: "asc" }] }),
    prisma.raum.findMany({ where: { aktiv: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-primary)]">Wochenvorlagen</h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          Feste, wiederkehrende Buchungsfenster je Mitarbeiterin - daraus werden rollierend {SLOT_VORLAUF_WOCHEN} Wochen im Voraus buchbare Slots
          generiert. Eine inhaltliche Änderung baut nur noch freie Zukunfts-Slots neu auf, bereits gebuchte bleiben unangetastet.
        </p>
      </div>
      <WochenvorlagenVerwaltung
        mitarbeiterinnen={mitarbeiterinnen.map((m) => ({ id: m.id, name: m.name }))}
        raeume={raeume.map((r) => ({ id: r.id, name: r.name }))}
        vorlagen={vorlagen.map((v) => ({
          id: v.id,
          employeeId: v.employeeId,
          label: v.label,
          wochentag: v.wochentag,
          startZeit: v.startZeit,
          endZeit: v.endZeit,
          slotDauerMinuten: v.slotDauerMinuten,
          raumId: v.raumId,
          aktiv: v.aktiv,
        }))}
      />
    </div>
  );
}
