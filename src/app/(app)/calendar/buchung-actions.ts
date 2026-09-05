"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser, canAccessCase } from "@/lib/rbac";
import { logAccess } from "@/lib/access-log";
import type { Session } from "next-auth";
import type { TerminKategorie, TerminArt } from "@prisma/client";
import { validiereUndBuche, markiereAlsAusgefallen, istBuchungsFehler, istBuchungsKonflikt, type BuchungsEingabe } from "@/lib/termine/buchung";
import type { TerminKonflikt } from "@/lib/termine/konflikte";

const KALENDER_PFAD = "/calendar";

function kannFuerMitarbeiterinBuchen(user: Session["user"], employeeId: string): boolean {
  return user.role === "ADMIN" || user.role === "VERWALTUNG" || user.id === employeeId;
}
function darfKonflikteUebersteuern(user: Session["user"]): boolean {
  return user.role === "ADMIN" || user.role === "VERWALTUNG";
}

function leseFormFelder(formData: FormData) {
  const kategorie = String(formData.get("kategorie") ?? "") as TerminKategorie;
  const terminArt = (String(formData.get("terminArt") ?? "") || null) as TerminArt | null;
  const caseId = String(formData.get("caseId") ?? "").trim() || null;
  const einzelmassnahmeBezeichnung = String(formData.get("einzelmassnahmeBezeichnung") ?? "").trim() || null;
  const titel = String(formData.get("titel") ?? "").trim();
  const terminname = String(formData.get("terminname") ?? "").trim() || null;
  const raumId = String(formData.get("raumId") ?? "").trim() || null;
  const note = String(formData.get("note") ?? "").trim() || null;
  const reminderMinutesBefore = formData.get("reminderMinutesBefore") ? Number(formData.get("reminderMinutesBefore")) : 60;
  const override = formData.get("override") != null;
  return { kategorie, terminArt, caseId, einzelmassnahmeBezeichnung, titel, terminname, raumId, note, reminderMinutesBefore, override };
}

export type BuchungActionState = { error?: string; konflikte?: TerminKonflikt[] } | undefined;

/** Buchung über einen bereits generierten, freien TerminSlot (primärer Weg aus dem Tages-/Wochenraster). */
export async function buchenUeberSlot(_prev: BuchungActionState, formData: FormData): Promise<BuchungActionState> {
  const user = await requireUser();
  const slotId = String(formData.get("slotId") ?? "").trim();
  if (!slotId) return { error: "Kein Slot ausgewählt." };

  const slot = await prisma.terminSlot.findUnique({ where: { id: slotId } });
  if (!slot) return { error: "Slot nicht gefunden." };
  if (!kannFuerMitarbeiterinBuchen(user, slot.employeeId)) return { error: "Du kannst nur in deinen eigenen Kalender buchen." };

  const felder = leseFormFelder(formData);
  if (felder.kategorie === "FALL_TERMIN" && felder.caseId) {
    const caseRecord = await prisma.case.findUnique({ where: { id: felder.caseId } });
    if (!caseRecord || !canAccessCase(user, caseRecord)) return { error: "Kein Zugriff auf diesen Fall." };
  }

  const eingabe: BuchungsEingabe = {
    kategorie: felder.kategorie,
    terminArt: felder.terminArt,
    titel: felder.titel,
    terminname: felder.terminname,
    caseId: felder.caseId,
    einzelmassnahmeBezeichnung: felder.einzelmassnahmeBezeichnung,
    employeeId: slot.employeeId,
    bookedById: user.id,
    slotId: slot.id,
    raumId: felder.raumId,
    startsAt: slot.startZeit,
    endsAt: slot.endZeit,
    note: felder.note,
    reminderMinutesBefore: felder.reminderMinutesBefore,
  };

  const override = felder.override && darfKonflikteUebersteuern(user);
  const ergebnis = await validiereUndBuche(eingabe, { override });
  if (istBuchungsFehler(ergebnis)) return { error: ergebnis.error };
  if (istBuchungsKonflikt(ergebnis)) return { konflikte: ergebnis.konflikte };

  await logAccess({ userId: user.id, action: "CREATE", entityType: "Termin", entityId: ergebnis.terminId, details: `Slot-Buchung (${felder.kategorie})` });
  revalidatePath(KALENDER_PFAD);
  if (felder.caseId) revalidatePath(`/cases/${felder.caseId}/appointments`);
}

/** Freie Ad-hoc-Zeiteingabe außerhalb eines generierten Slots (v.a. interne Termine/Ausnahmen). */
export async function buchenAdHoc(_prev: BuchungActionState, formData: FormData): Promise<BuchungActionState> {
  const user = await requireUser();
  const employeeId = String(formData.get("employeeId") ?? "").trim();
  if (!employeeId) return { error: "Bitte eine Mitarbeiterin auswählen." };
  if (!kannFuerMitarbeiterinBuchen(user, employeeId)) return { error: "Du kannst nur in deinen eigenen Kalender buchen." };

  const date = String(formData.get("date") ?? "");
  const startTime = String(formData.get("startTime") ?? "");
  const endTime = String(formData.get("endTime") ?? "");
  if (!date || !startTime || !endTime) return { error: "Bitte Datum sowie Start- und Endzeit angeben." };
  const startsAt = new Date(`${date}T${startTime}:00`);
  const endsAt = new Date(`${date}T${endTime}:00`);

  const felder = leseFormFelder(formData);
  if (felder.kategorie === "FALL_TERMIN" && felder.caseId) {
    const caseRecord = await prisma.case.findUnique({ where: { id: felder.caseId } });
    if (!caseRecord || !canAccessCase(user, caseRecord)) return { error: "Kein Zugriff auf diesen Fall." };
  }

  const eingabe: BuchungsEingabe = {
    kategorie: felder.kategorie,
    terminArt: felder.terminArt,
    titel: felder.titel,
    terminname: felder.terminname,
    caseId: felder.caseId,
    einzelmassnahmeBezeichnung: felder.einzelmassnahmeBezeichnung,
    employeeId,
    bookedById: user.id,
    slotId: null,
    raumId: felder.raumId,
    startsAt,
    endsAt,
    note: felder.note,
    reminderMinutesBefore: felder.reminderMinutesBefore,
  };

  const override = felder.override && darfKonflikteUebersteuern(user);
  const ergebnis = await validiereUndBuche(eingabe, { override });
  if (istBuchungsFehler(ergebnis)) return { error: ergebnis.error };
  if (istBuchungsKonflikt(ergebnis)) return { konflikte: ergebnis.konflikte };

  await logAccess({ userId: user.id, action: "CREATE", entityType: "Termin", entityId: ergebnis.terminId, details: `Ad-hoc-Buchung (${felder.kategorie})` });
  revalidatePath(KALENDER_PFAD);
  if (felder.caseId) revalidatePath(`/cases/${felder.caseId}/appointments`);
}

/** Termin als ausgefallen markieren statt zu löschen - Historie bleibt für die Auslastungsauswertung erhalten. */
export async function terminAlsAusgefallenMarkieren(terminId: string, ausfallNotiz: string): Promise<{ error?: string } | undefined> {
  const user = await requireUser();
  const termin = await prisma.termin.findUnique({ where: { id: terminId } });
  if (!termin) return { error: "Termin nicht gefunden." };
  if (!kannFuerMitarbeiterinBuchen(user, termin.employeeId) && termin.bookedById !== user.id) {
    return { error: "Kein Zugriff auf diesen Termin." };
  }

  await markiereAlsAusgefallen(terminId, ausfallNotiz.trim() || null);
  await logAccess({ userId: user.id, action: "UPDATE", entityType: "Termin", entityId: terminId, details: "Als ausgefallen markiert" });
  revalidatePath(KALENDER_PFAD);
  if (termin.caseId) revalidatePath(`/cases/${termin.caseId}/appointments`);
}
