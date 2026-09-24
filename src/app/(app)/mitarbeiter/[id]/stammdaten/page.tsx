import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdminOrVerwaltung } from "@/lib/rbac";
import { logAccess } from "@/lib/access-log";
import { employeeColor } from "@/lib/fahrtenrechner/employee-colors";
import { AccountActions } from "./account-actions";
import { StammdatenForm } from "./stammdaten-form";
import { MitarbeiterHeader } from "../mitarbeiter-header";
import { cardCls } from "@/app/(app)/cases/case-ui";

export default async function StammdatenPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminOrVerwaltung();
  const { id } = await params;

  const employee = await prisma.user.findUnique({ where: { id } });
  if (!employee) notFound();

  // Gleiche Reihenfolge wie die Kalender-Mitarbeiterinnen-Spalten (/calendar), damit der angezeigte
  // Standardwert exakt der tatsächlich verwendeten Fallback-Farbe entspricht.
  const kalenderMitarbeiterinnen = await prisma.user.findMany({ where: { role: { in: ["EMPLOYEE", "ADMIN"] }, active: true }, orderBy: { name: "asc" }, select: { id: true } });
  const index = kalenderMitarbeiterinnen.findIndex((m) => m.id === employee.id);
  const calendarColorDefault = employeeColor(index >= 0 ? index : 0);

  // Sensible Personaldaten - jeder Aufruf des Mitarbeiter-Bereichs wird protokolliert.
  await logAccess({ userId: admin.id, action: "VIEW", entityType: "User", entityId: employee.id, details: "Personalakte geöffnet" });

  return (
    <div className="flex flex-col gap-6">
      <MitarbeiterHeader id={employee.id} name={employee.name} role={employee.role} active={employee.active} viewerRole={admin.role} />
      <p className="text-sm text-[var(--color-text-muted)]">{employee.email}</p>

      <div className={cardCls}>
        <h2 className="mb-3 text-sm font-semibold text-[var(--color-text)]">Konto</h2>
        <p className="mb-3 text-sm text-[var(--color-text-muted)]">
          2FA {employee.totpEnabled ? "eingerichtet" : "ausstehend"} · Deaktivieren statt Löschen (Aufbewahrungspflichten Lohnunterlagen).
        </p>
        <AccountActions id={employee.id} active={employee.active} />
      </div>

      <div className={cardCls}>
        <h2 className="mb-3 text-sm font-semibold text-[var(--color-text)]">Personaldaten</h2>
        <StammdatenForm
          userId={employee.id}
          address={employee.address}
          birthday={employee.birthday ? employee.birthday.toISOString().slice(0, 10) : ""}
          emergencyContact={employee.emergencyContact}
          calendarColor={employee.calendarColor}
          calendarColorDefault={calendarColorDefault}
        />
      </div>
    </div>
  );
}
