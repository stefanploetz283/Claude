"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/rbac";
import { logAccess } from "@/lib/access-log";
import type { CaseStatus } from "@prisma/client";

export type ActionState = { error?: string } | undefined;

export async function createCase(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();

  const existingClientId = String(formData.get("existingClientId") ?? "").trim();
  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const birthDate = String(formData.get("birthDate") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const contactInfo = String(formData.get("contactInfo") ?? "").trim();

  const caseNumber = String(formData.get("caseNumber") ?? "").trim();
  const authority = String(formData.get("authority") ?? "").trim();
  const helpTypeId = String(formData.get("helpTypeId") ?? "").trim();
  const assignedEmployeeId = String(formData.get("assignedEmployeeId") ?? "").trim();
  const substituteEmployeeId = String(formData.get("substituteEmployeeId") ?? "").trim();
  const hoursContingent = Number(formData.get("hoursContingent") ?? 0);
  const startDate = String(formData.get("startDate") ?? "").trim();
  const helpPlanMeetingDate = String(formData.get("helpPlanMeetingDate") ?? "").trim();
  const extensionDeadline = String(formData.get("extensionDeadline") ?? "").trim();
  const reminderLeadDays = Number(formData.get("reminderLeadDays") ?? 14);

  if (!caseNumber || !authority || !helpTypeId || !assignedEmployeeId || !hoursContingent) {
    return { error: "Bitte alle Pflichtfelder ausfüllen." };
  }
  if (!existingClientId && (!firstName || !lastName)) {
    return { error: "Bitte einen Klienten auswählen oder neue Klientendaten angeben." };
  }

  const duplicateCaseNumber = await prisma.case.findUnique({ where: { caseNumber } });
  if (duplicateCaseNumber) {
    return { error: "Diese Fallnummer/Aktenzeichen existiert bereits." };
  }

  let clientId = existingClientId;
  if (!clientId) {
    const client = await prisma.client.create({
      data: {
        firstName,
        lastName,
        birthDate: birthDate ? new Date(birthDate) : null,
        address: address || null,
        contactInfo: contactInfo || null,
      },
    });
    clientId = client.id;
    await logAccess({ userId: user.id, action: "CREATE", entityType: "Client", entityId: client.id });
  }

  const newCase = await prisma.case.create({
    data: {
      caseNumber,
      authority,
      clientId,
      helpTypeId,
      assignedEmployeeId,
      substituteEmployeeId: substituteEmployeeId || null,
      hoursContingent,
      startDate: startDate ? new Date(startDate) : new Date(),
      helpPlanMeetingDate: helpPlanMeetingDate ? new Date(helpPlanMeetingDate) : null,
      extensionDeadline: extensionDeadline ? new Date(extensionDeadline) : null,
      reminderLeadDays: Number.isFinite(reminderLeadDays) && reminderLeadDays > 0 ? reminderLeadDays : 14,
      statusHistory: {
        create: { newStatus: "ACTIVE", reason: "Fall angelegt", changedById: user.id },
      },
    },
  });

  await logAccess({ userId: user.id, action: "CREATE", entityType: "Case", entityId: newCase.id });
  revalidatePath("/dashboard");
  redirect(`/cases/${newCase.id}`);
}

export async function updateCaseStatus(formData: FormData) {
  const user = await requireUser();
  const caseId = String(formData.get("caseId") ?? "");
  const newStatus = String(formData.get("newStatus") ?? "") as CaseStatus;
  const reason = String(formData.get("reason") ?? "").trim() || null;

  const existing = await prisma.case.findUnique({ where: { id: caseId } });
  if (!existing) return;

  await prisma.$transaction([
    prisma.case.update({
      where: { id: caseId },
      data: {
        status: newStatus,
        endDate: newStatus === "COMPLETED" ? new Date() : existing.endDate,
      },
    }),
    prisma.caseStatusHistory.create({
      data: { caseId, oldStatus: existing.status, newStatus, reason, changedById: user.id },
    }),
  ]);

  await logAccess({ userId: user.id, action: "UPDATE", entityType: "Case", entityId: caseId, details: `Status → ${newStatus}` });
  revalidatePath(`/cases/${caseId}`);
  revalidatePath("/dashboard");
}

export async function archiveCase(caseId: string) {
  const user = await requireUser();
  await prisma.case.update({ where: { id: caseId }, data: { archived: true } });
  await logAccess({ userId: user.id, action: "ARCHIVE", entityType: "Case", entityId: caseId });
  revalidatePath("/dashboard");
  redirect("/dashboard");
}
