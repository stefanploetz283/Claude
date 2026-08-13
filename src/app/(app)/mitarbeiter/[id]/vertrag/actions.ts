"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/rbac";
import { logAccess } from "@/lib/access-log";
import { geocodeAddress } from "@/lib/fahrtenrechner/geocode";
import type { PrimaerStandort } from "@prisma/client";

export type ActionState = { error?: string; success?: string } | undefined;

export async function saveVertrag(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();

  const employeeId = String(formData.get("employeeId") ?? "");
  const wochenstunden = Number(formData.get("wochenstunden") ?? "");
  const tageProWoche = Number(formData.get("tageProWoche") ?? "");
  const eintrittsdatumStr = String(formData.get("eintrittsdatum") ?? "").trim();
  const tvoedStufe = String(formData.get("tvoedStufe") ?? "").trim() || null;
  const allowedHelpTypeIds = formData.getAll("allowedHelpTypeIds").map(String);

  if (!employeeId || !Number.isFinite(wochenstunden) || wochenstunden <= 0) {
    return { error: "Bitte gültige Wochenstunden angeben." };
  }
  if (tageProWoche !== 4 && tageProWoche !== 5) {
    return { error: "Tage/Woche muss 4 oder 5 sein." };
  }

  const employee = await prisma.user.findUnique({ where: { id: employeeId } });
  if (!employee) return { error: "Mitarbeiter nicht gefunden." };

  // Bestandsschutz-Snapshot: nur beim allerersten Speichern die aktuelle Fonds-Basis einfrieren.
  let fondsBasisAtHire = employee.fondsBasisAtHire;
  if (fondsBasisAtHire == null) {
    const settings = await prisma.settings.findUnique({ where: { id: "singleton" } });
    fondsBasisAtHire = settings?.aktuelleFondsBasis ?? null;
  }

  await prisma.user.update({
    where: { id: employeeId },
    data: {
      weeklyContractHours: wochenstunden,
      weeklyWorkDays: tageProWoche,
      hireDate: eintrittsdatumStr ? new Date(eintrittsdatumStr) : null,
      fondsBasisAtHire,
      tvoedStufe,
      allowedHelpTypes: { set: allowedHelpTypeIds.map((id) => ({ id })) },
    },
  });

  await logAccess({ userId: admin.id, action: "UPDATE", entityType: "User", entityId: employeeId, details: "Vertrag & Stundenmodell gespeichert" });
  revalidatePath(`/mitarbeiter/${employeeId}/vertrag`);
  return { success: "Gespeichert." };
}

export type WochenplanEntry = { day: number; start: string; end: string };

export async function savePlan(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();

  const employeeId = String(formData.get("employeeId") ?? "");
  const gueltigAbStr = String(formData.get("gueltigAb") ?? "").trim();
  const wochenplanStr = String(formData.get("wochenplan") ?? "[]");
  const sondertagIds = formData.getAll("sondertagIds").map(String);

  if (!employeeId || !gueltigAbStr) return { error: "Bitte gültig ab-Datum angeben." };

  let wochenplan: WochenplanEntry[];
  try {
    wochenplan = JSON.parse(wochenplanStr);
  } catch {
    return { error: "Ungültiger Wochenplan." };
  }

  await prisma.mitarbeiterPlan.create({
    data: {
      employeeId,
      gueltigAb: new Date(gueltigAbStr),
      wochenplan,
      sondertage: { connect: sondertagIds.map((id) => ({ id })) },
    },
  });

  await logAccess({
    userId: admin.id,
    action: "CREATE",
    entityType: "MitarbeiterPlan",
    entityId: employeeId,
    details: `Gültig ab ${gueltigAbStr}`,
  });
  revalidatePath(`/mitarbeiter/${employeeId}/vertrag`);
  revalidatePath("/admin/team-uebersicht");
  return { success: "Plan gespeichert (neue Version, gültig ab)." };
}

/**
 * Fahrten-/Fallrechner-Profil: Wohnort (Referenzpunkt), primärer Standort, Einsatzradius, manuelle
 * Ziel-FLS-Std./Woche (Vorbelegung bis der Stundenmodell-Rechner direkt angebunden ist). Geocodiert den
 * Wohnort nur, wenn sich die Adresse tatsächlich geändert hat - kein Nominatim-Aufruf bei unverändertem
 * Speichern (Rate-Limit 1 Anfrage/Sekunde, siehe Prompt).
 */
export async function saveFahrtenrechnerProfil(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();

  const employeeId = String(formData.get("employeeId") ?? "");
  const wohnortAdresse = String(formData.get("wohnortAdresse") ?? "").trim();
  const primaerStandort = String(formData.get("primaerStandort") ?? "") as PrimaerStandort;
  const einsatzradiusKmStr = String(formData.get("einsatzradiusKm") ?? "").trim();
  const zielFlsStdWocheManuellStr = String(formData.get("zielFlsStdWocheManuell") ?? "").trim();

  if (!employeeId) return { error: "Mitarbeiter nicht gefunden." };
  if (primaerStandort !== "NITTENDORF" && primaerStandort !== "REGENSBURG") {
    return { error: "Bitte einen gültigen primären Standort wählen." };
  }
  const einsatzradiusKm = Number(einsatzradiusKmStr.replace(",", "."));
  if (!Number.isFinite(einsatzradiusKm) || einsatzradiusKm <= 0) {
    return { error: "Bitte einen gültigen Einsatzradius (km) angeben." };
  }
  let zielFlsStdWocheManuell: number | null = null;
  if (zielFlsStdWocheManuellStr) {
    zielFlsStdWocheManuell = Number(zielFlsStdWocheManuellStr.replace(",", "."));
    if (!Number.isFinite(zielFlsStdWocheManuell) || zielFlsStdWocheManuell < 0) {
      return { error: "Bitte eine gültige Ziel-FLS-Stundenzahl angeben." };
    }
  }

  const employee = await prisma.user.findUnique({ where: { id: employeeId } });
  if (!employee) return { error: "Mitarbeiter nicht gefunden." };

  let wohnortLat = employee.wohnortLat?.toNumber() ?? null;
  let wohnortLng = employee.wohnortLng?.toNumber() ?? null;

  if (!wohnortAdresse) {
    wohnortLat = null;
    wohnortLng = null;
  } else if (wohnortAdresse !== employee.wohnortAdresse) {
    const geocoded = await geocodeAddress(wohnortAdresse);
    if (!geocoded) {
      return {
        error:
          "Die Adresse konnte nicht automatisch geocodiert werden. Bitte Schreibweise prüfen (z.B. \"Straße Hausnr., PLZ Ort\") und erneut versuchen.",
      };
    }
    wohnortLat = geocoded.lat;
    wohnortLng = geocoded.lng;
  }

  await prisma.user.update({
    where: { id: employeeId },
    data: { wohnortAdresse: wohnortAdresse || null, wohnortLat, wohnortLng, primaerStandort, einsatzradiusKm, zielFlsStdWocheManuell },
  });

  await logAccess({ userId: admin.id, action: "UPDATE", entityType: "User", entityId: employeeId, details: "Fahrtenrechner-Profil gespeichert" });
  revalidatePath(`/mitarbeiter/${employeeId}/vertrag`);
  revalidatePath("/admin/fahrtenrechner");
  return { success: "Gespeichert." };
}
