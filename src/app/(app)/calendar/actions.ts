"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/rbac";
import { logAccess } from "@/lib/access-log";

export type ActionState = { error?: string } | undefined;

export async function createAppointment(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();

  const title = String(formData.get("title") ?? "").trim();
  const caseId = String(formData.get("caseId") ?? "").trim() || null;
  const date = String(formData.get("date") ?? "");
  const startTime = String(formData.get("startTime") ?? "");
  const endTime = String(formData.get("endTime") ?? "");
  const location = String(formData.get("location") ?? "").trim() || null;
  const note = String(formData.get("note") ?? "").trim() || null;
  const reminderMinutesBefore = Number(formData.get("reminderMinutesBefore") ?? 60);

  if (!title || !date || !startTime || !endTime) {
    return { error: "Bitte Titel, Datum sowie Start- und Endzeit angeben." };
  }

  const startsAt = new Date(`${date}T${startTime}:00`);
  const endsAt = new Date(`${date}T${endTime}:00`);
  if (endsAt <= startsAt) return { error: "Die Endzeit muss nach der Startzeit liegen." };

  await prisma.appointment.create({
    data: { title, caseId, organizerId: user.id, startsAt, endsAt, location, note, reminderMinutesBefore },
  });

  await logAccess({ userId: user.id, action: "CREATE", entityType: "Appointment" });
  revalidatePath("/calendar");
}

export async function deleteAppointment(id: string) {
  const user = await requireUser();
  const appointment = await prisma.appointment.findUnique({ where: { id } });
  if (!appointment || (appointment.organizerId !== user.id && user.role !== "ADMIN")) return;

  await prisma.appointment.delete({ where: { id } });
  await logAccess({ userId: user.id, action: "UPDATE", entityType: "Appointment", entityId: id, details: "Gelöscht" });
  revalidatePath("/calendar");
}
