"use server";

import { addDays } from "date-fns";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser, canAccessCase } from "@/lib/rbac";
import { logAccess } from "@/lib/access-log";
import { toDateInputValue } from "@/lib/date";
import type { TerminArt } from "@prisma/client";
import { validiereUndBuche, istBuchungsFehler, istBuchungsKonflikt, type BuchungsEingabe } from "@/lib/termine/buchung";

// Serientermine sind laut Vorgabe auf Fall-Termine beschränkt ("Ein Fall-Termin soll direkt als Serie
// angelegt werden können"). Jede Einzel-Occurrence durchläuft dieselbe Konfliktprüfung wie eine normale
// Buchung; Occurrences mit Konflikt werden übersprungen und einzeln gemeldet, statt die ganze Serie
// abzubrechen - so kommen zumindest die konfliktfreien Termine zustande.
export type SerieErgebnis = { angelegt: number; uebersprungen: { datum: string; grund: string }[] } | { error: string };

export async function serieAnlegen(_prev: SerieErgebnis | undefined, formData: FormData): Promise<SerieErgebnis> {
  const user = await requireUser();

  const employeeId = String(formData.get("employeeId") ?? "").trim();
  const caseId = String(formData.get("caseId") ?? "").trim();
  const terminArt = String(formData.get("terminArt") ?? "").trim() as TerminArt;
  const titel = String(formData.get("titel") ?? "").trim();
  const raumId = String(formData.get("raumId") ?? "").trim() || null;
  const note = String(formData.get("note") ?? "").trim() || null;
  const startDate = String(formData.get("startDate") ?? "");
  const startTime = String(formData.get("startTime") ?? "");
  const endTime = String(formData.get("endTime") ?? "");
  const rhythmusTage = Number(formData.get("rhythmusTage") ?? 7);
  const bisDatum = String(formData.get("bisDatum") ?? "");

  if (!employeeId || !caseId || !terminArt || !startDate || !startTime || !endTime || !bisDatum) {
    return { error: "Bitte alle Pflichtfelder ausfüllen." };
  }
  if (user.role !== "ADMIN" && user.role !== "VERWALTUNG" && user.id !== employeeId) {
    return { error: "Du kannst nur in deinen eigenen Kalender buchen." };
  }
  const caseRecord = await prisma.case.findUnique({ where: { id: caseId } });
  if (!caseRecord || !canAccessCase(user, caseRecord)) return { error: "Kein Zugriff auf diesen Fall." };

  const ersterStart = new Date(`${startDate}T${startTime}:00`);
  const ersterEnd = new Date(`${startDate}T${endTime}:00`);
  if (ersterEnd <= ersterStart) return { error: "Die Endzeit muss nach der Startzeit liegen." };
  const dauerMs = ersterEnd.getTime() - ersterStart.getTime();
  const bisEnde = new Date(`${bisDatum}T23:59:59`);
  if (bisEnde < ersterStart) return { error: "Das Bis-Datum liegt vor dem Start." };

  const serie = await prisma.terminSerie.create({ data: { rhythmusTage, bisDatum: new Date(`${bisDatum}T00:00:00Z`) } });

  let angelegt = 0;
  const uebersprungen: { datum: string; grund: string }[] = [];
  let current = ersterStart;

  while (current.getTime() <= bisEnde.getTime()) {
    const startsAt = current;
    const endsAt = new Date(startsAt.getTime() + dauerMs);
    const passenderSlot = await prisma.terminSlot.findFirst({ where: { employeeId, startZeit: startsAt, status: "FREI" } });

    const eingabe: BuchungsEingabe = {
      kategorie: "FALL_TERMIN",
      terminArt,
      titel: titel || terminArt,
      caseId,
      einzelmassnahmeBezeichnung: null,
      employeeId,
      bookedById: user.id,
      slotId: passenderSlot?.id ?? null,
      raumId,
      startsAt,
      endsAt,
      note,
      reminderMinutesBefore: 60,
      serieId: serie.id,
    };

    const ergebnis = await validiereUndBuche(eingabe, { override: false });
    if (istBuchungsFehler(ergebnis)) {
      uebersprungen.push({ datum: toDateInputValue(startsAt), grund: ergebnis.error });
    } else if (istBuchungsKonflikt(ergebnis)) {
      uebersprungen.push({ datum: toDateInputValue(startsAt), grund: `Konflikt mit ${ergebnis.konflikte.length} Termin(en)` });
    } else {
      angelegt++;
    }

    current = addDays(current, rhythmusTage);
  }

  if (angelegt === 0) {
    await prisma.terminSerie.delete({ where: { id: serie.id } });
    return { error: "Es konnte kein einziger Termin der Serie angelegt werden (siehe Konflikte)." };
  }

  await logAccess({ userId: user.id, action: "CREATE", entityType: "TerminSerie", entityId: serie.id, details: `${angelegt} Termine angelegt, ${uebersprungen.length} übersprungen` });
  revalidatePath("/calendar");
  revalidatePath(`/cases/${caseId}/appointments`);
  return { angelegt, uebersprungen };
}
