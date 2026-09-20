"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/rbac";
import { logAccess } from "@/lib/access-log";

export type ActionState = { error?: string; success?: string } | undefined;

export async function createAufgabe(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();

  const titel = String(formData.get("titel") ?? "").trim();
  if (!titel) return { error: "Bitte einen Titel angeben." };

  const faelligAmStr = String(formData.get("faelligAm") ?? "").trim();
  const caseIdRaw = String(formData.get("caseId") ?? "").trim();
  // Verwaltung darf keine fallgebundene Aufgabe anlegen - sieht ohnehin keine Fälle zur Auswahl,
  // aber zur Sicherheit auch serverseitig erzwungen.
  const caseId = caseIdRaw && user.role !== "VERWALTUNG" ? caseIdRaw : null;

  await prisma.aufgabe.create({
    data: {
      titel,
      faelligAm: faelligAmStr ? new Date(`${faelligAmStr}T00:00:00.000Z`) : null,
      zugewiesenAnId: user.id,
      erstelltVonId: user.id,
      caseId,
    },
  });

  await logAccess({ userId: user.id, action: "CREATE", entityType: "Aufgabe" });
  revalidatePath("/aufgaben");
  revalidatePath("/heute");
  return { success: "Aufgabe angelegt." };
}

export async function toggleAufgabe(id: string, erledigt: boolean) {
  const user = await requireUser();

  const aufgabe = await prisma.aufgabe.findUnique({ where: { id } });
  if (!aufgabe || aufgabe.zugewiesenAnId !== user.id) return;

  await prisma.aufgabe.update({
    where: { id },
    data: { erledigt, erledigtAm: erledigt ? new Date() : null },
  });

  await logAccess({ userId: user.id, action: "UPDATE", entityType: "Aufgabe", entityId: id });
  revalidatePath("/aufgaben");
  revalidatePath("/heute");
}

export async function deleteAufgabe(id: string) {
  const user = await requireUser();

  const aufgabe = await prisma.aufgabe.findUnique({ where: { id } });
  if (!aufgabe || aufgabe.zugewiesenAnId !== user.id) return;

  await prisma.aufgabe.delete({ where: { id } });

  await logAccess({ userId: user.id, action: "DELETE", entityType: "Aufgabe", entityId: id });
  revalidatePath("/aufgaben");
  revalidatePath("/heute");
}
