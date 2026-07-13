import { notFound } from "next/navigation";
import { format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { requireUser, canAccessCase } from "@/lib/rbac";
import { CaseTabs } from "../case-tabs";
import { UploadForm } from "./upload-form";
import { DocumentList, type DocumentRow } from "./document-list";

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function DocumentsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();

  const caseRecord = await prisma.case.findUnique({ where: { id }, include: { client: true } });
  if (!caseRecord) notFound();
  if (!canAccessCase(user, caseRecord)) notFound();

  const documents = await prisma.document.findMany({
    where: { caseId: id },
    include: { uploadedBy: true },
    orderBy: { uploadedAt: "desc" },
  });

  const rows: DocumentRow[] = documents.map((d) => ({
    id: d.id,
    fileName: d.fileName,
    category: d.category,
    sizeLabel: formatSize(d.sizeBytes),
    uploadedAt: format(d.uploadedAt, "dd.MM.yyyy HH:mm"),
    uploadedByName: d.uploadedBy.name,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-[var(--color-text)]">
          {caseRecord.client.lastName}, {caseRecord.client.firstName}
        </h1>
        <p className="mt-1 text-sm text-black/60">{caseRecord.caseNumber}</p>
      </div>

      <CaseTabs caseId={id} />

      <UploadForm caseId={id} />

      <div className="overflow-x-auto rounded-lg border border-black/10 bg-white">
        <DocumentList caseId={id} documents={rows} />
      </div>
    </div>
  );
}
