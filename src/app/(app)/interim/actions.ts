"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireInterimAdmin } from "@/lib/rbac";
import { logAccess } from "@/lib/access-log";
import type { InterimAngebotsart } from "@prisma/client";

export type ActionState = { error?: string } | undefined;

function combineDateTime(dateStr: string, timeStr: string) {
  return new Date(`${dateStr}T${timeStr}:00`);
}

export async function createInterimCase(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireInterimAdmin();

  const angebotsart = String(formData.get("angebotsart") ?? "") as InterimAngebotsart;
  const familienname = String(formData.get("familienname") ?? "").trim();
  const vorname = String(formData.get("vorname") ?? "").trim();
  const strasseHausnummer = String(formData.get("strasseHausnummer") ?? "").trim();
  const plzOrt = String(formData.get("plzOrt") ?? "").trim();
  const sachbearbeiterSpfd = String(formData.get("sachbearbeiterSpfd") ?? "").trim();
  const bewilligteWochenstundenStr = String(formData.get("bewilligteWochenstunden") ?? "").trim();
  const honorarProStundeStr = String(formData.get("honorarProStunde") ?? "").trim();
  const leistungserbringer = String(formData.get("leistungserbringer") ?? "").trim() || "Stefan Plötz";

  if (angebotsart !== "ERZIEHUNGSBEISTANDSCHAFT" && angebotsart !== "PROS") {
    return { error: "Bitte eine gültige Angebotsart wählen." };
  }
  if (!familienname || !vorname || !strasseHausnummer || !plzOrt || !sachbearbeiterSpfd) {
    return { error: "Bitte alle Felder ausfüllen." };
  }
  const bewilligteWochenstunden = Number(bewilligteWochenstundenStr.replace(",", "."));
  const honorarProStunde = Number(honorarProStundeStr.replace(",", "."));
  if (!Number.isFinite(bewilligteWochenstunden) || bewilligteWochenstunden <= 0) {
    return { error: "Bitte gültige bewilligte Wochenstunden angeben." };
  }
  if (!Number.isFinite(honorarProStunde) || honorarProStunde <= 0) {
    return { error: "Bitte ein gültiges Honorar pro Stunde angeben." };
  }

  const created = await prisma.interimCase.create({
    data: {
      angebotsart,
      familienname,
      vorname,
      strasseHausnummer,
      plzOrt,
      sachbearbeiterSpfd,
      bewilligteWochenstunden,
      honorarProStunde,
      leistungserbringer,
    },
  });

  await logAccess({ userId: user.id, action: "CREATE", entityType: "InterimCase", entityId: created.id });
  revalidatePath("/interim");
  redirect(`/interim/${created.id}`);
}

/** Nachträgliche Korrektur der Falldaten - gilt sofort für alle künftigen Exporte, bereits
 * heruntergeladene Excel-Dateien bleiben unberührt (die enthalten nur den damaligen Stand). */
export async function updateInterimCase(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireInterimAdmin();

  const id = String(formData.get("id") ?? "");
  const angebotsart = String(formData.get("angebotsart") ?? "") as InterimAngebotsart;
  const familienname = String(formData.get("familienname") ?? "").trim();
  const vorname = String(formData.get("vorname") ?? "").trim();
  const strasseHausnummer = String(formData.get("strasseHausnummer") ?? "").trim();
  const plzOrt = String(formData.get("plzOrt") ?? "").trim();
  const sachbearbeiterSpfd = String(formData.get("sachbearbeiterSpfd") ?? "").trim();
  const bewilligteWochenstundenStr = String(formData.get("bewilligteWochenstunden") ?? "").trim();
  const honorarProStundeStr = String(formData.get("honorarProStunde") ?? "").trim();
  const leistungserbringer = String(formData.get("leistungserbringer") ?? "").trim() || "Stefan Plötz";

  if (!id) return { error: "Fall nicht gefunden." };
  if (angebotsart !== "ERZIEHUNGSBEISTANDSCHAFT" && angebotsart !== "PROS") {
    return { error: "Bitte eine gültige Angebotsart wählen." };
  }
  if (!familienname || !vorname || !strasseHausnummer || !plzOrt || !sachbearbeiterSpfd) {
    return { error: "Bitte alle Felder ausfüllen." };
  }
  const bewilligteWochenstunden = Number(bewilligteWochenstundenStr.replace(",", "."));
  const honorarProStunde = Number(honorarProStundeStr.replace(",", "."));
  if (!Number.isFinite(bewilligteWochenstunden) || bewilligteWochenstunden <= 0) {
    return { error: "Bitte gültige bewilligte Wochenstunden angeben." };
  }
  if (!Number.isFinite(honorarProStunde) || honorarProStunde <= 0) {
    return { error: "Bitte ein gültiges Honorar pro Stunde angeben." };
  }

  await prisma.interimCase.update({
    where: { id },
    data: {
      angebotsart,
      familienname,
      vorname,
      strasseHausnummer,
      plzOrt,
      sachbearbeiterSpfd,
      bewilligteWochenstunden,
      honorarProStunde,
      leistungserbringer,
    },
  });

  await logAccess({ userId: user.id, action: "UPDATE", entityType: "InterimCase", entityId: id });
  revalidatePath("/interim");
  revalidatePath(`/interim/${id}`);
  return undefined;
}

export async function createInterimEntry(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireInterimAdmin();

  const caseId = String(formData.get("caseId") ?? "");
  const date = String(formData.get("date") ?? "");
  const startTimeStr = String(formData.get("startTime") ?? "");
  const endTimeStr = String(formData.get("endTime") ?? "");
  const content = String(formData.get("content") ?? "").trim();

  if (!date || !startTimeStr || !endTimeStr || !content) {
    return { error: "Bitte alle Felder ausfüllen." };
  }

  const startTime = combineDateTime(date, startTimeStr);
  const endTime = combineDateTime(date, endTimeStr);
  if (endTime.getTime() <= startTime.getTime()) {
    return { error: "Die Endzeit muss nach der Startzeit liegen." };
  }

  await prisma.interimEntry.create({
    data: { caseId, date: new Date(date), startTime, endTime, content },
  });

  await logAccess({ userId: user.id, action: "CREATE", entityType: "InterimEntry", entityId: caseId });
  revalidatePath(`/interim/${caseId}`);
  revalidatePath("/interim"); // Stunden pro Fall + Gesamtsumme auf der Übersicht sollen sofort mit aktualisieren.
  return undefined;
}

export async function deleteInterimEntry(id: string, caseId: string) {
  const user = await requireInterimAdmin();
  await prisma.interimEntry.delete({ where: { id } });
  await logAccess({ userId: user.id, action: "UPDATE", entityType: "InterimEntry", entityId: id, details: "Gelöscht" });
  revalidatePath(`/interim/${caseId}`);
  revalidatePath("/interim");
}
