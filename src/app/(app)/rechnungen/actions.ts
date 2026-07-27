"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdminOrVerwaltung } from "@/lib/rbac";
import { logAccess } from "@/lib/access-log";

export type ActionState = { error?: string; success?: string } | undefined;

/** Ändert ausschließlich den Stundensatz - im Unterschied zu updateSettings (Admin-only, volle Praxis-Einstellungen). */
export async function updateHourlyRate(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireAdminOrVerwaltung();

  const raw = String(formData.get("hourlyRate") ?? "").trim();
  const hourlyRate = raw ? Number(raw) : null;
  if (raw && (!Number.isFinite(hourlyRate) || hourlyRate! < 0)) {
    return { error: "Bitte einen gültigen Stundensatz angeben." };
  }

  await prisma.settings.update({ where: { id: "singleton" }, data: { hourlyRate } });
  await logAccess({ userId: user.id, action: "UPDATE", entityType: "Settings", details: "Stundensatz geändert" });
  revalidatePath("/rechnungen");
  return { success: "Stundensatz gespeichert." };
}
