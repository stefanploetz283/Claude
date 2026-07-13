"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser, canAccessCase } from "@/lib/rbac";
import { logAccess } from "@/lib/access-log";

export type ActionState = { error?: string } | undefined;

function combineDateTime(dateStr: string, timeStr: string) {
  return new Date(`${dateStr}T${timeStr}:00`);
}

async function assertCaseAccess(caseId: string) {
  const user = await requireUser();
  const caseRecord = await prisma.case.findUnique({ where: { id: caseId } });
  if (!caseRecord || !canAccessCase(user, caseRecord)) {
    throw new Error("Kein Zugriff auf diesen Fall.");
  }
  return user;
}

export async function createServiceEntry(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const caseId = String(formData.get("caseId") ?? "");
  const date = String(formData.get("date") ?? "");
  const startTimeStr = String(formData.get("startTime") ?? "");
  const endTimeStr = String(formData.get("endTime") ?? "");
  const description = String(formData.get("description") ?? "").trim();

  if (!date || !startTimeStr || !endTimeStr || !description) {
    return { error: "Bitte alle Felder ausfüllen." };
  }

  const startTime = combineDateTime(date, startTimeStr);
  const endTime = combineDateTime(date, endTimeStr);
  const durationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / 60000);

  if (durationMinutes <= 0) {
    return { error: "Die Endzeit muss nach der Startzeit liegen." };
  }

  const user = await assertCaseAccess(caseId);

  await prisma.serviceEntry.create({
    data: { caseId, employeeId: user.id, date: new Date(date), startTime, endTime, durationMinutes, description },
  });

  await logAccess({ userId: user.id, action: "CREATE", entityType: "ServiceEntry", entityId: caseId });
  revalidatePath(`/cases/${caseId}/service-entries`);
  revalidatePath(`/cases/${caseId}`);
}

export async function updateServiceEntry(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const id = String(formData.get("id") ?? "");
  const caseId = String(formData.get("caseId") ?? "");
  const date = String(formData.get("date") ?? "");
  const startTimeStr = String(formData.get("startTime") ?? "");
  const endTimeStr = String(formData.get("endTime") ?? "");
  const description = String(formData.get("description") ?? "").trim();

  if (!date || !startTimeStr || !endTimeStr || !description) {
    return { error: "Bitte alle Felder ausfüllen." };
  }

  const startTime = combineDateTime(date, startTimeStr);
  const endTime = combineDateTime(date, endTimeStr);
  const durationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / 60000);

  if (durationMinutes <= 0) {
    return { error: "Die Endzeit muss nach der Startzeit liegen." };
  }

  const user = await assertCaseAccess(caseId);

  await prisma.serviceEntry.update({
    where: { id },
    data: { date: new Date(date), startTime, endTime, durationMinutes, description },
  });

  await logAccess({ userId: user.id, action: "UPDATE", entityType: "ServiceEntry", entityId: id });
  revalidatePath(`/cases/${caseId}/service-entries`);
  revalidatePath(`/cases/${caseId}`);
}

export async function deleteServiceEntry(id: string, caseId: string) {
  const user = await assertCaseAccess(caseId);
  await prisma.serviceEntry.delete({ where: { id } });
  await logAccess({ userId: user.id, action: "UPDATE", entityType: "ServiceEntry", entityId: id, details: "Gelöscht" });
  revalidatePath(`/cases/${caseId}/service-entries`);
  revalidatePath(`/cases/${caseId}`);
}
