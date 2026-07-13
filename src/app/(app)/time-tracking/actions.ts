"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/rbac";
import { logAccess } from "@/lib/access-log";
import { getRunningTimeEntry } from "@/lib/time-helpers";
import type { GeneralActivity } from "@prisma/client";

export type ActionState = { error?: string } | undefined;

function parseAssignment(formData: FormData): { caseId: string | null; generalActivity: GeneralActivity | null } | { error: string } {
  const assignmentType = String(formData.get("assignmentType") ?? "");
  if (assignmentType === "case") {
    const caseId = String(formData.get("caseId") ?? "").trim();
    if (!caseId) return { error: "Bitte einen Fall auswählen." };
    return { caseId, generalActivity: null };
  }
  if (assignmentType === "general") {
    const generalActivity = String(formData.get("generalActivity") ?? "") as GeneralActivity;
    if (!generalActivity) return { error: "Bitte eine Tätigkeit auswählen." };
    return { caseId: null, generalActivity };
  }
  return { error: "Bitte eine Zuordnung wählen." };
}

export async function startTimer(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();

  const existing = await getRunningTimeEntry(user.id);
  if (existing) return { error: "Es läuft bereits ein Timer. Bitte zuerst stoppen." };

  const assignment = parseAssignment(formData);
  if ("error" in assignment) return assignment;

  const now = new Date();
  await prisma.timeEntry.create({
    data: {
      employeeId: user.id,
      caseId: assignment.caseId,
      generalActivity: assignment.generalActivity,
      date: now,
      startTime: now,
      endTime: null,
      durationMinutes: 0,
      source: "TIMER",
    },
  });

  revalidatePath("/time-tracking");
}

export async function stopTimer() {
  const user = await requireUser();
  const running = await getRunningTimeEntry(user.id);
  if (!running || !running.startTime) return;

  const now = new Date();
  const durationMinutes = Math.max(1, Math.round((now.getTime() - running.startTime.getTime()) / 60000));

  await prisma.timeEntry.update({
    where: { id: running.id },
    data: { endTime: now, durationMinutes },
  });

  revalidatePath("/time-tracking");
}

export async function createManualEntry(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();

  const assignment = parseAssignment(formData);
  if ("error" in assignment) return assignment;

  const date = String(formData.get("date") ?? "");
  const startTimeStr = String(formData.get("startTime") ?? "").trim();
  const endTimeStr = String(formData.get("endTime") ?? "").trim();
  const durationHoursStr = String(formData.get("durationHours") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim() || null;

  if (!date) return { error: "Bitte ein Datum angeben." };

  let startTime: Date | null = null;
  let endTime: Date | null = null;
  let durationMinutes: number;

  if (durationHoursStr) {
    const hours = Number(durationHoursStr.replace(",", "."));
    if (!Number.isFinite(hours) || hours === 0) return { error: "Bitte eine gültige Stundenzahl (auch negativ für Korrekturen) angeben." };
    durationMinutes = Math.round(hours * 60);
  } else if (startTimeStr && endTimeStr) {
    startTime = new Date(`${date}T${startTimeStr}:00`);
    endTime = new Date(`${date}T${endTimeStr}:00`);
    durationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / 60000);
    if (durationMinutes <= 0) return { error: "Die Endzeit muss nach der Startzeit liegen." };
  } else {
    return { error: "Bitte entweder Von/Bis-Zeiten oder eine direkte Stundenzahl angeben." };
  }

  await prisma.timeEntry.create({
    data: {
      employeeId: user.id,
      caseId: assignment.caseId,
      generalActivity: assignment.generalActivity,
      date: new Date(date),
      startTime,
      endTime,
      durationMinutes,
      note,
      source: "MANUAL",
    },
  });

  await logAccess({ userId: user.id, action: "CREATE", entityType: "TimeEntry" });
  revalidatePath("/time-tracking");
}

export async function deleteTimeEntry(id: string) {
  const user = await requireUser();
  const entry = await prisma.timeEntry.findUnique({ where: { id } });
  if (!entry || (entry.employeeId !== user.id && user.role !== "ADMIN")) return;

  await prisma.timeEntry.delete({ where: { id } });
  await logAccess({ userId: user.id, action: "UPDATE", entityType: "TimeEntry", entityId: id, details: "Gelöscht" });
  revalidatePath("/time-tracking");
}
