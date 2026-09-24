import { notFound } from "next/navigation";
import { format, differenceInCalendarDays } from "date-fns";
import { prisma } from "@/lib/prisma";
import { requireAdminOrVerwaltung } from "@/lib/rbac";
import { UploadForm } from "./upload-form";
import { DocumentList, type EmployeeDocumentRow } from "./document-list";
import { FzeugnisForm } from "./fzeugnis-form";
import { MitarbeiterHeader } from "../mitarbeiter-header";
import { cardCls, noticeWarnCls } from "@/app/(app)/cases/case-ui";
import { IconWarnTriangle } from "@/app/(app)/cases/case-icons";

const REMINDER_LEAD_DAYS = 8 * 7; // 8 Wochen vor Ablauf

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function DokumentePage({ params }: { params: Promise<{ id: string }> }) {
  const viewer = await requireAdminOrVerwaltung();
  const { id } = await params;

  const employee = await prisma.user.findUnique({ where: { id } });
  if (!employee) notFound();

  const documents = await prisma.employeeDocument.findMany({
    where: { employeeId: id },
    include: { uploadedBy: true },
    orderBy: { uploadedAt: "desc" },
  });

  const rows: EmployeeDocumentRow[] = documents.map((d) => ({
    id: d.id,
    fileName: d.fileName,
    category: d.category,
    sizeLabel: formatSize(d.sizeBytes),
    uploadedAt: format(d.uploadedAt, "dd.MM.yyyy HH:mm"),
    uploadedByName: d.uploadedBy.name,
  }));

  const now = new Date();
  const daysUntilExpiry = employee.fuehrungszeugnisGueltigBis
    ? differenceInCalendarDays(employee.fuehrungszeugnisGueltigBis, now)
    : null;
  const showReminder = daysUntilExpiry != null && daysUntilExpiry <= REMINDER_LEAD_DAYS;

  return (
    <div className="flex flex-col gap-6">
      <MitarbeiterHeader id={employee.id} name={employee.name} role={employee.role} active={employee.active} viewerRole={viewer.role} />

      <div className={cardCls}>
        <h2 className="mb-1 text-sm font-semibold text-[var(--color-text)]">Erweitertes Führungszeugnis</h2>
        <p className="mb-3 text-sm text-[var(--color-text-muted)]">Nach § 72a SGB VIII, Erinnerung {REMINDER_LEAD_DAYS / 7} Wochen vor Ablauf.</p>
        {showReminder && (
          <p className={`mb-3 flex items-center gap-2 ${noticeWarnCls} text-[var(--pros-status-attention-text)]`}>
            <IconWarnTriangle />
            Läuft {daysUntilExpiry! >= 0 ? `in ${daysUntilExpiry} Tagen` : `seit ${-daysUntilExpiry!} Tagen`} ab
            {employee.fuehrungszeugnisGueltigBis ? ` (${format(employee.fuehrungszeugnisGueltigBis, "dd.MM.yyyy")})` : ""} – bitte erneuern lassen.
          </p>
        )}
        <FzeugnisForm
          employeeId={id}
          gueltigBis={employee.fuehrungszeugnisGueltigBis ? employee.fuehrungszeugnisGueltigBis.toISOString().slice(0, 10) : ""}
        />
      </div>

      <UploadForm employeeId={id} />

      <div className="overflow-x-auto rounded-[var(--pros-r-md)] border border-[var(--pros-border-strong)] bg-[var(--color-surface)] shadow-[var(--pros-shadow)]">
        <DocumentList employeeId={id} documents={rows} />
      </div>
    </div>
  );
}
