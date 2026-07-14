"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser, canAccessCase } from "@/lib/rbac";
import { logAccess } from "@/lib/access-log";
import { uploadFile, deleteFile, buildStorageKey } from "@/lib/storage";

export type ActionState = { error?: string } | undefined;

const MAX_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB

export async function uploadDocument(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const caseId = String(formData.get("caseId") ?? "");
  const category = String(formData.get("category") ?? "").trim() || null;
  const file = formData.get("file");

  const caseRecord = await prisma.case.findUnique({ where: { id: caseId } });
  if (!caseRecord || !canAccessCase(user, caseRecord)) return { error: "Kein Zugriff auf diesen Fall." };

  if (!(file instanceof File) || file.size === 0) {
    return { error: "Bitte eine Datei auswählen." };
  }
  if (file.size > MAX_SIZE_BYTES) {
    return { error: "Die Datei ist zu groß (max. 20 MB)." };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const key = buildStorageKey(`cases/${caseId}`, file.name);

  try {
    await uploadFile(key, buffer, file.type || "application/octet-stream");
  } catch {
    return { error: "Upload fehlgeschlagen. Bitte Speicherkonfiguration prüfen." };
  }

  await prisma.document.create({
    data: {
      caseId,
      fileName: file.name,
      fileKey: key,
      mimeType: file.type || "application/octet-stream",
      sizeBytes: file.size,
      category,
      uploadedById: user.id,
    },
  });

  await logAccess({ userId: user.id, action: "CREATE", entityType: "Document", entityId: caseId });
  revalidatePath(`/cases/${caseId}/documents`);
}

export async function deleteDocument(id: string, caseId: string) {
  const user = await requireUser();
  const caseRecord = await prisma.case.findUnique({ where: { id: caseId } });
  if (!caseRecord || !canAccessCase(user, caseRecord)) return;

  const doc = await prisma.document.findUnique({ where: { id } });
  if (!doc) return;

  await deleteFile(doc.fileKey).catch(() => {});
  await prisma.document.delete({ where: { id } });
  await logAccess({ userId: user.id, action: "UPDATE", entityType: "Document", entityId: id, details: "Gelöscht" });
  revalidatePath(`/cases/${caseId}/documents`);
}
