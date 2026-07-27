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

export type DefaultsActionState = { error?: string } | undefined;

export async function updateHelpTypeDefaults(_prev: DefaultsActionState, formData: FormData): Promise<DefaultsActionState> {
  const admin = await requireAdmin();
  const id = String(formData.get("helpTypeId") ?? "");
  const durationStr = String(formData.get("defaultDurationWeeks") ?? "").trim();
  const minStr = String(formData.get("defaultTotalHoursMin") ?? "").trim();
  const maxStr = String(formData.get("defaultTotalHoursMax") ?? "").trim();

  const defaultDurationWeeks = durationStr ? Number(durationStr) : null;
  const defaultTotalHoursMin = minStr ? Number(minStr) : null;
  const defaultTotalHoursMax = maxStr ? Number(maxStr) : null;

  if (durationStr && (!Number.isFinite(defaultDurationWeeks) || defaultDurationWeeks! <= 0)) {
    return { error: "Bitte eine gültige Laufzeit in Wochen angeben." };
  }
  if (minStr && (!Number.isFinite(defaultTotalHoursMin) || defaultTotalHoursMin! < 0)) {
    return { error: "Bitte eine gültige Mindest-Gesamtstundenzahl angeben." };
  }
  if (maxStr && (!Number.isFinite(defaultTotalHoursMax) || defaultTotalHoursMax! < 0)) {
    return { error: "Bitte eine gültige Höchst-Gesamtstundenzahl angeben." };
  }

  await prisma.helpType.update({
    where: { id },
    data: { defaultDurationWeeks, defaultTotalHoursMin, defaultTotalHoursMax },
  });
  await logAccess({ userId: admin.id, action: "UPDATE", entityType: "HelpType", entityId: id, details: "Referenzwerte geändert" });
  revalidatePath("/admin/help-types");
}

export async function addActivityProfileRow(helpTypeId: string, activityLabel: string, hoursPerWeek: string) {
  const admin = await requireAdmin();
  const label = activityLabel.trim();
  if (!label) return;
  const hours = hoursPerWeek.trim() ? Number(hoursPerWeek) : null;

  const count = await prisma.helpTypeActivityProfile.count({ where: { helpTypeId } });
  await prisma.helpTypeActivityProfile.create({
    data: { helpTypeId, activityLabel: label, hoursPerWeek: hours, sortOrder: count },
  });
  await logAccess({ userId: admin.id, action: "CREATE", entityType: "HelpTypeActivityProfile", entityId: helpTypeId, details: label });
  revalidatePath("/admin/help-types");
}

export async function updateActivityProfileRow(id: string, activityLabel: string, hoursPerWeek: string) {
  const admin = await requireAdmin();
  const label = activityLabel.trim();
  if (!label) return;
  const hours = hoursPerWeek.trim() ? Number(hoursPerWeek) : null;

  await prisma.helpTypeActivityProfile.update({ where: { id }, data: { activityLabel: label, hoursPerWeek: hours } });
  await logAccess({ userId: admin.id, action: "UPDATE", entityType: "HelpTypeActivityProfile", entityId: id });
  revalidatePath("/admin/help-types");
}

export async function deleteActivityProfileRow(id: string) {
  const admin = await requireAdmin();
  await prisma.helpTypeActivityProfile.delete({ where: { id } });
  await logAccess({ userId: admin.id, action: "DELETE", entityType: "HelpTypeActivityProfile", entityId: id });
  revalidatePath("/admin/help-types");
}
