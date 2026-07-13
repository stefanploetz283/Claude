import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, canAccessCase } from "@/lib/rbac";
import { logAccess } from "@/lib/access-log";
import { downloadFile } from "@/lib/storage";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string; docId: string }> }) {
  const { id, docId } = await params;
  const user = await requireUser();

  const caseRecord = await prisma.case.findUnique({ where: { id } });
  if (!caseRecord || !canAccessCase(user, caseRecord)) {
    return NextResponse.json({ error: "Kein Zugriff" }, { status: 403 });
  }

  const doc = await prisma.document.findUnique({ where: { id: docId } });
  if (!doc || doc.caseId !== id) {
    return NextResponse.json({ error: "Dokument nicht gefunden" }, { status: 404 });
  }

  const { body } = await downloadFile(doc.fileKey);
  await logAccess({ userId: user.id, action: "VIEW", entityType: "Document", entityId: docId });

  return new NextResponse(new Uint8Array(body), {
    headers: {
      "Content-Type": doc.mimeType,
      "Content-Disposition": `inline; filename="${encodeURIComponent(doc.fileName)}"`,
    },
  });
}
