"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/rbac";
import { logAccess } from "@/lib/access-log";
import { uploadFile, buildStorageKey } from "@/lib/storage";

export type AvatarActionState = { error?: string; success?: string } | undefined;

export async function updateOwnAvatar(_prev: AvatarActionState, formData: FormData): Promise<AvatarActionState> {
  const user = await requireUser();

  const avatar = formData.get("avatar");
  if (!(avatar instanceof File) || avatar.size === 0) {
    return { error: "Bitte ein Bild auswählen." };
  }
  if (!avatar.type.startsWith("image/")) {
    return { error: "Das Profilbild muss eine Bilddatei sein." };
  }
  if (avatar.size > 5 * 1024 * 1024) {
    return { error: "Das Bild darf höchstens 5 MB groß sein." };
  }

  const buffer = Buffer.from(await avatar.arrayBuffer());
  const key = buildStorageKey("avatars", avatar.name);
  try {
    await uploadFile(key, buffer, avatar.type);
  } catch {
    return { error: "Upload fehlgeschlagen. Bitte Speicherkonfiguration prüfen." };
  }

  await prisma.user.update({ where: { id: user.id }, data: { avatarUrl: key } });
  await logAccess({ userId: user.id, action: "UPDATE", entityType: "User" });
  revalidatePath("/", "layout");
  return { success: "Profilbild aktualisiert." };
}
