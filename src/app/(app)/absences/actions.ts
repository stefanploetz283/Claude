"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/rbac";
import { logAccess } from "@/lib/access-log";
import type { AbsenceType } from "@prisma/client";

export type ActionState = { error?: string } | undefined;

export async function createAbsence(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();

  const targetEmployeeId = user.role === "ADMIN" ? String(formData.get("employeeId") ?? user.id) : user.id;
  const type = String(formData.get("type") ?? "URLAUB") as AbsenceType;
  const startDate = String(formData.get("startDate") ?? "");
  const endDate = String(formData.get("endDate") ?? "");
  const note = String(formData.get("note") ?? "").trim() || null;

  if (!startDate || !endDate) return { error: "Bitte Start- und Enddatum angeben." };
  if (new Date(endDate) < new Date(startDate)) return { error: "Das Enddatum darf nicht vor dem Startdatum liegen." };

  await prisma.absence.create({
    data: { employeeId: targetEmployeeId, type, startDate: new Date(startDate), endDate: new Date(endDate), note },
  });

  await logAccess({ userId: user.id, action: "CREATE", entityType: "Absence" });
  revalidatePath("/absences");
}

export async function deleteAbsence(id: string) {
  const user = await requireUser();
  const absence = await prisma.absence.findUnique({ where: { id } });
  if (!absence || (absence.employeeId !== user.id && user.role !== "ADMIN")) return;

  await prisma.absence.delete({ where: { id } });
  await logAccess({ userId: user.id, action: "UPDATE", entityType: "Absence", entityId: id, details: "Gelöscht" });
  revalidatePath("/absences");
}
