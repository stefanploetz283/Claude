import { notFound } from "next/navigation";
import { format, differenceInCalendarDays } from "date-fns";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/rbac";
import { UploadForm } from "./upload-form";
import { DocumentList, type EmployeeDocumentRow } from "./document-list";
import { FzeugnisForm } from "./fzeugnis-form";

const REMINDER_LEAD_DAYS = 8 * 7; // 8 Wochen vor Ablauf

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function DokumentePage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
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
      <div>
        <h1 className="text-xl font-semibold text-[var(--color-text)]">Dokumente · {employee.name}</h1>
      </div>

      <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-soft)]">
        <h2 className="mb-1 text-sm font-semibold text-[var(--color-text)]">Erweitertes Führungszeugnis</h2>
        <p className="mb-3 text-sm text-[var(--color-text-muted)]">Nach § 72a SGB VIII, Erinnerung {REMINDER_LEAD_DAYS / 7} Wochen vor Ablauf.</p>
        {showReminder && (
          <p className="mb-3 rounded-[var(--radius-control)] bg-[var(--color-warn-soft)] px-3.5 py-2.5 text-sm text-[var(--color-warn-text)]">
            ⚠ Läuft {daysUntilExpiry! >= 0 ? `in ${daysUntilExpiry} Tagen` : `seit ${-daysUntilExpiry!} Tagen`} ab
            {employee.fuehrungszeugnisGueltigBis ? ` (${format(employee.fuehrungszeugnisGueltigBis, "dd.MM.yyyy")})` : ""} – bitte erneuern lassen.
          </p>
        )}
        <FzeugnisForm
          employeeId={id}
          gueltigBis={employee.fuehrungszeugnisGueltigBis ? employee.fuehrungszeugnisGueltigBis.toISOString().slice(0, 10) : ""}
        />
      </div>

      <UploadForm employeeId={id} />

      <div className="overflow-x-auto rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-soft)]">
        <DocumentList employeeId={id} documents={rows} />
      </div>
    </div>
  );
}
