import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/rbac";
import { logAccess } from "@/lib/access-log";
import { AccountActions } from "./account-actions";
import { StammdatenForm } from "./stammdaten-form";

const ROLE_LABELS: Record<string, string> = { ADMIN: "Admin", EMPLOYEE: "Fachkraft", VERWALTUNG: "Verwaltung" };

export default async function StammdatenPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  const { id } = await params;

  const employee = await prisma.user.findUnique({ where: { id } });
  if (!employee) notFound();

  // Sensible Personaldaten - jeder Aufruf des Mitarbeiter-Bereichs wird protokolliert.
  await logAccess({ userId: admin.id, action: "VIEW", entityType: "User", entityId: employee.id, details: "Personalakte geöffnet" });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-semibold text-[var(--color-text)]">{employee.name}</h1>
        <span className="rounded-full bg-[var(--color-primary-soft)] px-3 py-1 text-xs font-semibold text-[var(--color-primary)]">
          {ROLE_LABELS[employee.role] ?? employee.role}
        </span>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            employee.active ? "bg-[var(--color-primary-soft)] text-[var(--color-primary)]" : "bg-[var(--color-border)] text-[var(--color-text-muted)]"
          }`}
        >
          {employee.active ? "Aktiv" : "Deaktiviert"}
        </span>
      </div>
      <p className="text-sm text-[var(--color-text-muted)]">{employee.email}</p>

      <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-soft)]">
        <h2 className="mb-3 text-sm font-semibold text-[var(--color-text)]">Konto</h2>
        <p className="mb-3 text-sm text-[var(--color-text-muted)]">
          2FA {employee.totpEnabled ? "eingerichtet" : "ausstehend"} · Deaktivieren statt Löschen (Aufbewahrungspflichten Lohnunterlagen).
        </p>
        <AccountActions id={employee.id} active={employee.active} />
      </div>

      <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-soft)]">
        <h2 className="mb-3 text-sm font-semibold text-[var(--color-text)]">Personaldaten</h2>
        <StammdatenForm
          userId={employee.id}
          address={employee.address}
          birthday={employee.birthday ? employee.birthday.toISOString().slice(0, 10) : ""}
          emergencyContact={employee.emergencyContact}
        />
      </div>
    </div>
  );
}
