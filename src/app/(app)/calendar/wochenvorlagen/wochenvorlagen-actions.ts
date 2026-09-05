"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdminOrVerwaltung } from "@/lib/rbac";
import { logAccess } from "@/lib/access-log";
import { generiereSlotsFuerMitarbeiterin, regenerierFreieSlotsNachVorlagenAenderung, SLOT_VORLAUF_WOCHEN } from "@/lib/termine/slot-generierung";

const PFAD = "/calendar/wochenvorlagen";
const SLOT_DAUERN = [60, 90, 120];

export type VorlageActionState = { error?: string } | undefined;

function leseWochentagUndZeiten(formData: FormData): { wochentag: number; startZeit: string; endZeit: string; slotDauerMinuten: number } | { error: string } {
  const wochentag = Number(formData.get("wochentag"));
  const startZeit = String(formData.get("startZeit") ?? "");
  const endZeit = String(formData.get("endZeit") ?? "");
  const slotDauerMinuten = Number(formData.get("slotDauerMinuten"));
  if (!Number.isInteger(wochentag) || wochentag < 1 || wochentag > 7) return { error: "Bitte einen gültigen Wochentag wählen." };
  if (!/^\d{2}:\d{2}$/.test(startZeit) || !/^\d{2}:\d{2}$/.test(endZeit)) return { error: "Bitte Start- und Endzeit angeben." };
  if (endZeit <= startZeit) return { error: "Die Endzeit muss nach der Startzeit liegen." };
  if (!SLOT_DAUERN.includes(slotDauerMinuten)) return { error: "Bitte eine gültige Slot-Dauer wählen (60/90/120 Minuten)." };
  return { wochentag, startZeit, endZeit, slotDauerMinuten };
}

export async function createVorlage(_prev: VorlageActionState, formData: FormData): Promise<VorlageActionState> {
  const user = await requireAdminOrVerwaltung();
  const employeeId = String(formData.get("employeeId") ?? "").trim();
  if (!employeeId) return { error: "Bitte eine Mitarbeiterin auswählen." };
  const felder = leseWochentagUndZeiten(formData);
  if ("error" in felder) return felder;
  const label = String(formData.get("label") ?? "").trim() || null;
  const raumId = String(formData.get("raumId") ?? "").trim() || null;

  const vorlage = await prisma.terminWochenvorlage.create({ data: { employeeId, label, raumId, ...felder } });
  await generiereSlotsFuerMitarbeiterin(employeeId, addWeeksHelper(SLOT_VORLAUF_WOCHEN));
  await logAccess({ userId: user.id, action: "CREATE", entityType: "TerminWochenvorlage", entityId: vorlage.id });
  revalidatePath(PFAD);
  revalidatePath("/calendar");
}

export async function updateVorlage(_prev: VorlageActionState, formData: FormData): Promise<VorlageActionState> {
  const user = await requireAdminOrVerwaltung();
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Vorlage nicht gefunden." };
  const felder = leseWochentagUndZeiten(formData);
  if ("error" in felder) return felder;
  const label = String(formData.get("label") ?? "").trim() || null;
  const raumId = String(formData.get("raumId") ?? "").trim() || null;

  await prisma.terminWochenvorlage.update({ where: { id }, data: { label, raumId, ...felder } });
  await regenerierFreieSlotsNachVorlagenAenderung(id);
  await logAccess({ userId: user.id, action: "UPDATE", entityType: "TerminWochenvorlage", entityId: id });
  revalidatePath(PFAD);
  revalidatePath("/calendar");
}

/** Deaktivieren statt löschen: bereits erzeugte (auch freie) Slots bleiben bestehen, es werden nur keine neuen mehr generiert. */
export async function toggleVorlageAktiv(id: string, aktiv: boolean): Promise<void> {
  const user = await requireAdminOrVerwaltung();
  await prisma.terminWochenvorlage.update({ where: { id }, data: { aktiv } });
  await regenerierFreieSlotsNachVorlagenAenderung(id);
  await logAccess({ userId: user.id, action: "UPDATE", entityType: "TerminWochenvorlage", entityId: id, details: aktiv ? "Aktiviert" : "Deaktiviert" });
  revalidatePath(PFAD);
  revalidatePath("/calendar");
}

/** Manueller Fallback-Trigger, falls die bedarfsgesteuerte Generierung beim Kalender-Aufruf nicht reicht (z.B. Tests). */
export async function generiereSlotsJetzt(employeeId: string): Promise<{ erstellt: number }> {
  await requireAdminOrVerwaltung();
  const ergebnis = await generiereSlotsFuerMitarbeiterin(employeeId, addWeeksHelper(SLOT_VORLAUF_WOCHEN));
  revalidatePath("/calendar");
  return ergebnis;
}

function addWeeksHelper(wochen: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + wochen * 7);
  return d;
}
