"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdminOrVerwaltung } from "@/lib/rbac";
import { logAccess } from "@/lib/access-log";

export type ActionState = { error?: string; success?: string } | undefined;

export async function createWaitlistEntry(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireAdminOrVerwaltung();

  const clientName = String(formData.get("clientName") ?? "").trim();
  const authority = String(formData.get("authority") ?? "").trim() || null;
  const helpTypeId = String(formData.get("helpTypeId") ?? "").trim();
  const urgencyNote = String(formData.get("urgencyNote") ?? "").trim() || null;

  if (!clientName || !helpTypeId) {
    return { error: "Bitte Name/Kennung und Hilfeart angeben." };
  }

  await prisma.waitlistEntry.create({
    data: { clientName, authority, helpTypeId, urgencyNote, createdById: user.id },
  });

  await logAccess({ userId: user.id, action: "CREATE", entityType: "WaitlistEntry", details: clientName });
  revalidatePath("/kapazitaet");
  return { success: "Auf die Warteliste gesetzt." };
}

export async function cancelWaitlistEntry(id: string) {
  const user = await requireAdminOrVerwaltung();
  await prisma.waitlistEntry.update({ where: { id }, data: { status: "CANCELLED" } });
  await logAccess({ userId: user.id, action: "UPDATE", entityType: "WaitlistEntry", entityId: id, details: "Zurückgezogen" });
  revalidatePath("/kapazitaet");
}

export type ConvertActionState = { error?: string } | undefined;

/** Wandelt einen Warteliste-Eintrag in einen echten Fall um ("Einplanen"). */
export async function convertWaitlistEntry(_prev: ConvertActionState, formData: FormData): Promise<ConvertActionState> {
  const user = await requireAdminOrVerwaltung();

  const waitlistEntryId = String(formData.get("waitlistEntryId") ?? "");
  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const authority = String(formData.get("authority") ?? "").trim();
  const assignedEmployeeId = String(formData.get("assignedEmployeeId") ?? "").trim();
  const startDate = String(formData.get("startDate") ?? "").trim();
  const expectedEndDate = String(formData.get("expectedEndDate") ?? "").trim();
  const hoursContingentStr = String(formData.get("hoursContingent") ?? "").trim();
  const contingentPeriodMonthsStr = String(formData.get("contingentPeriodMonths") ?? "12").trim();
  const phaseOutWeeksStr = String(formData.get("phaseOutWeeks") ?? "").trim();

  const hoursContingent = Number(hoursContingentStr);
  const contingentPeriodMonths = Number(contingentPeriodMonthsStr);

  if (!firstName || !lastName || !authority || !assignedEmployeeId || !startDate || !hoursContingent) {
    return { error: "Bitte alle Pflichtfelder ausfüllen." };
  }

  const entry = await prisma.waitlistEntry.findUnique({ where: { id: waitlistEntryId } });
  if (!entry || entry.status !== "WAITING") {
    return { error: "Dieser Warteliste-Eintrag ist nicht mehr offen." };
  }

  const client = await prisma.client.create({ data: { firstName, lastName } });
  const caseNumber = `AZ-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`.toUpperCase();

  const newCase = await prisma.case.create({
    data: {
      caseNumber,
      authority,
      clientId: client.id,
      helpTypeId: entry.helpTypeId,
      assignedEmployeeId,
      hoursContingent,
      contingentPeriodMonths: Number.isFinite(contingentPeriodMonths) && contingentPeriodMonths > 0 ? contingentPeriodMonths : 12,
      startDate: new Date(startDate),
      expectedEndDate: expectedEndDate ? new Date(expectedEndDate) : null,
      phaseOutWeeks: phaseOutWeeksStr ? Number(phaseOutWeeksStr) : null,
      statusHistory: { create: { newStatus: "ACTIVE", reason: "Aus Warteliste eingeplant", changedById: user.id } },
    },
  });

  await prisma.waitlistEntry.update({ where: { id: waitlistEntryId }, data: { status: "CONVERTED", matchedCaseId: newCase.id } });

  await logAccess({ userId: user.id, action: "CREATE", entityType: "Case", entityId: newCase.id, details: "Aus Warteliste eingeplant" });
  revalidatePath("/kapazitaet");
  redirect(`/cases/${newCase.id}`);
}
