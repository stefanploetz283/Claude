"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/rbac";
import { logAccess } from "@/lib/access-log";
import { uploadFile, deleteFile, buildStorageKey } from "@/lib/storage";

export type ActionState = { error?: string; success?: string } | undefined;

const MAX_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB

export async function uploadEmployeeDocument(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const employeeId = String(formData.get("employeeId") ?? "");
  const category = String(formData.get("category") ?? "").trim() || null;
  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) return { error: "Bitte eine Datei auswählen." };
  if (file.size > MAX_SIZE_BYTES) return { error: "Die Datei ist zu groß (max. 20 MB)." };

  const buffer = Buffer.from(await file.arrayBuffer());
  const key = buildStorageKey(`employees/${employeeId}`, file.name);

  try {
    await uploadFile(key, buffer, file.type || "application/octet-stream");
  } catch {
    return { error: "Upload fehlgeschlagen. Bitte Speicherkonfiguration prüfen." };
  }

  await prisma.employeeDocument.create({
    data: {
      employeeId,
      fileName: file.name,
      fileKey: key,
      mimeType: file.type || "application/octet-stream",
      sizeBytes: file.size,
      category,
      uploadedById: admin.id,
    },
  });

  await logAccess({ userId: admin.id, action: "CREATE", entityType: "EmployeeDocument", entityId: employeeId, details: category ?? undefined });
  revalidatePath(`/mitarbeiter/${employeeId}/dokumente`);
}

export async function deleteEmployeeDocument(id: string, employeeId: string) {
  const admin = await requireAdmin();
  const doc = await prisma.employeeDocument.findUnique({ where: { id } });
  if (!doc) return;

  await deleteFile(doc.fileKey).catch(() => {});
  await prisma.employeeDocument.delete({ where: { id } });
  await logAccess({ userId: admin.id, action: "UPDATE", entityType: "EmployeeDocument", entityId: id, details: "Gelöscht" });
  revalidatePath(`/mitarbeiter/${employeeId}/dokumente`);
}

export async function saveFuehrungszeugnisDatum(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const employeeId = String(formData.get("employeeId") ?? "");
  const gueltigBisStr = String(formData.get("fuehrungszeugnisGueltigBis") ?? "").trim();

  await prisma.user.update({
    where: { id: employeeId },
    data: { fuehrungszeugnisGueltigBis: gueltigBisStr ? new Date(gueltigBisStr) : null },
  });

  await logAccess({ userId: admin.id, action: "UPDATE", entityType: "User", entityId: employeeId, details: "Führungszeugnis-Datum geändert" });
  revalidatePath(`/mitarbeiter/${employeeId}/dokumente`);
  return { success: "Gespeichert." };
}
