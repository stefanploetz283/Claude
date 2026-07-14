"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/rbac";
import { logAccess } from "@/lib/access-log";

export type ActionState = { error?: string } | undefined;

export async function createHelpType(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;

  if (!name) return { error: "Bitte eine Bezeichnung angeben." };

  const existing = await prisma.helpType.findUnique({ where: { name } });
  if (existing) return { error: "Diese Hilfeart existiert bereits." };

  const helpType = await prisma.helpType.create({ data: { name, description } });
  await logAccess({ userId: admin.id, action: "CREATE", entityType: "HelpType", entityId: helpType.id });
  revalidatePath("/admin/help-types");
}

export async function setHelpTypeArchived(id: string, archived: boolean) {
  const admin = await requireAdmin();
  await prisma.helpType.update({ where: { id }, data: { archived } });
  await logAccess({
    userId: admin.id,
    action: "UPDATE",
    entityType: "HelpType",
    entityId: id,
    details: archived ? "Archiviert" : "Reaktiviert",
  });
  revalidatePath("/admin/help-types");
}
