"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/rbac";
import { getSettings } from "@/lib/settings";
import { logAccess } from "@/lib/access-log";
import { uploadFile, deleteFile, buildStorageKey } from "@/lib/storage";

export type ActionState = { error?: string } | undefined;

const MAX_SIZE_BYTES = 20 * 1024 * 1024;

async function assertCanContribute() {
  const user = await requireUser();
  if (user.role === "ADMIN") return user;
  const settings = await getSettings();
  if (!settings.employeesCanContributeKnowledge) {
    throw new Error("Mitarbeiter dürfen aktuell keine Inhalte beitragen.");
  }
  return user;
}

function parseTags(raw: string) {
  return raw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

export async function createKnowledgeFile(_prev: ActionState, formData: FormData): Promise<ActionState> {
  let user;
  try {
    user = await assertCanContribute();
  } catch (e) {
    return { error: (e as Error).message };
  }

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const folder = String(formData.get("folder") ?? "").trim() || null;
  const tags = parseTags(String(formData.get("tags") ?? ""));
  const file = formData.get("file");

  if (!title) return { error: "Bitte einen Titel angeben." };
  if (!(file instanceof File) || file.size === 0) return { error: "Bitte eine Datei auswählen." };
  if (file.size > MAX_SIZE_BYTES) return { error: "Die Datei ist zu groß (max. 20 MB)." };

  const isImage = file.type.startsWith("image/");
  const buffer = Buffer.from(await file.arrayBuffer());
  const key = buildStorageKey("knowledge", file.name);

  try {
    await uploadFile(key, buffer, file.type || "application/octet-stream");
  } catch {
    return { error: "Upload fehlgeschlagen. Bitte Speicherkonfiguration prüfen." };
  }

  await prisma.knowledgeItem.create({
    data: {
      title,
      type: isImage ? "IMAGE" : "DOCUMENT",
      description,
      fileKey: key,
      mimeType: file.type || "application/octet-stream",
      sizeBytes: file.size,
      folder,
      tags,
      createdById: user.id,
    },
  });

  await logAccess({ userId: user.id, action: "CREATE", entityType: "KnowledgeItem" });
  revalidatePath("/knowledge-base");
}

export async function createKnowledgeLink(_prev: ActionState, formData: FormData): Promise<ActionState> {
  let user;
  try {
    user = await assertCanContribute();
  } catch (e) {
    return { error: (e as Error).message };
  }

  const title = String(formData.get("title") ?? "").trim();
  const url = String(formData.get("url") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const folder = String(formData.get("folder") ?? "").trim() || null;
  const tags = parseTags(String(formData.get("tags") ?? ""));

  if (!title || !url) return { error: "Bitte Titel und Link angeben." };
  try {
    new URL(url);
  } catch {
    return { error: "Bitte eine gültige URL angeben (inkl. https://)." };
  }

  await prisma.knowledgeItem.create({
    data: { title, type: "LINK", description, url, folder, tags, createdById: user.id },
  });

  await logAccess({ userId: user.id, action: "CREATE", entityType: "KnowledgeItem" });
  revalidatePath("/knowledge-base");
}

export async function deleteKnowledgeItem(id: string) {
  const user = await requireUser();
  const item = await prisma.knowledgeItem.findUnique({ where: { id } });
  if (!item) return;
  if (user.role !== "ADMIN" && item.createdById !== user.id) return;

  if (item.fileKey) await deleteFile(item.fileKey).catch(() => {});
  await prisma.knowledgeItem.delete({ where: { id } });
  await logAccess({ userId: user.id, action: "UPDATE", entityType: "KnowledgeItem", entityId: id, details: "Gelöscht" });
  revalidatePath("/knowledge-base");
}
