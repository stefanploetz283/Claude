"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser, requireAdmin } from "@/lib/rbac";
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

  const authority = String(formData.get("authority") ?? "").trim();
  const helpTypeId = String(formData.get("helpTypeId") ?? "").trim();
  const assignedEmployeeId = String(formData.get("assignedEmployeeId") ?? "").trim();
  const substituteEmployeeId = String(formData.get("substituteEmployeeId") ?? "").trim();
  const hoursContingent = Number(formData.get("hoursContingent") ?? 0);
  const contingentPeriodMonths = Number(formData.get("contingentPeriodMonths") ?? 0);
  const startDate = String(formData.get("startDate") ?? "").trim();
  const expectedEndDate = String(formData.get("expectedEndDate") ?? "").trim();
  const phaseOutWeeksStr = String(formData.get("phaseOutWeeks") ?? "").trim();
  const helpPlanMeetingDate = String(formData.get("helpPlanMeetingDate") ?? "").trim();
  const extensionDeadline = String(formData.get("extensionDeadline") ?? "").trim();
  const reminderLeadDays = Number(formData.get("reminderLeadDays") ?? 14);

  if (!authority || !helpTypeId || !assignedEmployeeId || !hoursContingent) {
    return { error: "Bitte alle Pflichtfelder ausfüllen." };
  }
  if (!contingentPeriodMonths || contingentPeriodMonths < 1 || contingentPeriodMonths > 24) {
    return { error: "Bitte einen Zeitraum zwischen 1 und 24 Monaten angeben." };
  }
  if (!existingClientId && (!firstName || !lastName)) {
    return { error: "Bitte einen Klienten auswählen oder neue Klientendaten angeben." };
  }

  const caseNumber = `AZ-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`.toUpperCase();

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
      contingentPeriodMonths,
      startDate: startDate ? new Date(startDate) : new Date(),
      expectedEndDate: expectedEndDate ? new Date(expectedEndDate) : null,
      phaseOutWeeks: phaseOutWeeksStr ? Number(phaseOutWeeksStr) : null,
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

export async function updateCaseCapacityFields(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const caseId = String(formData.get("caseId") ?? "");
  const expectedEndDate = String(formData.get("expectedEndDate") ?? "").trim();
  const phaseOutWeeksStr = String(formData.get("phaseOutWeeks") ?? "").trim();

  await prisma.case.update({
    where: { id: caseId },
    data: {
      expectedEndDate: expectedEndDate ? new Date(expectedEndDate) : null,
      phaseOutWeeks: phaseOutWeeksStr ? Number(phaseOutWeeksStr) : null,
    },
  });

  await logAccess({ userId: user.id, action: "UPDATE", entityType: "Case", entityId: caseId, details: "Kapazitätsplanung geändert" });
  revalidatePath(`/cases/${caseId}`);
  return undefined;
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

export async function deleteCase(caseId: string): Promise<{ error?: string } | undefined> {
  const user = await requireAdmin();

  const caseRecord = await prisma.case.findUnique({ where: { id: caseId } });
  if (!caseRecord) return { error: "Fall nicht gefunden." };

  const [serviceEntryCount, appointmentCount, documentCount, messageCount, timeEntryCount] = await Promise.all([
    prisma.serviceEntry.count({ where: { caseId } }),
    prisma.appointment.count({ where: { caseId } }),
    prisma.document.count({ where: { caseId } }),
    prisma.message.count({ where: { caseId } }),
    prisma.timeEntry.count({ where: { caseId } }),
  ]);

  const totalEntries = serviceEntryCount + appointmentCount + documentCount + messageCount + timeEntryCount;
  if (totalEntries > 0) {
    return {
      error: `Diese Hilfe kann nicht gelöscht werden, da bereits ${totalEntries} zugehörige Einträge vorhanden sind (Leistungsdokumentation, Termine, Dokumente, Nachrichten oder Zeiterfassung). Bitte stattdessen archivieren.`,
    };
  }

  await prisma.$transaction([
    prisma.caseStatusHistory.deleteMany({ where: { caseId } }),
    prisma.case.delete({ where: { id: caseId } }),
  ]);

  await logAccess({ userId: user.id, action: "DELETE", entityType: "Case", entityId: caseId, details: caseRecord.caseNumber });
  revalidatePath("/dashboard");
  redirect("/dashboard");
}
