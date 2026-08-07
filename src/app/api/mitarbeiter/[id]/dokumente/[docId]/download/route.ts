import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/rbac";
import { logAccess } from "@/lib/access-log";
import { downloadFile } from "@/lib/storage";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string; docId: string }> }) {
  const admin = await requireAdmin();
  const { id, docId } = await params;

  const doc = await prisma.employeeDocument.findUnique({ where: { id: docId } });
  if (!doc || doc.employeeId !== id) {
    return NextResponse.json({ error: "Dokument nicht gefunden" }, { status: 404 });
  }

  const { body } = await downloadFile(doc.fileKey);
  await logAccess({ userId: admin.id, action: "VIEW", entityType: "EmployeeDocument", entityId: docId });

  return new NextResponse(new Uint8Array(body), {
    headers: {
      "Content-Type": doc.mimeType,
      "Content-Disposition": `inline; filename="${encodeURIComponent(doc.fileName)}"`,
    },
  });
}
