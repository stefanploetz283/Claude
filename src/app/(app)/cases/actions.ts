"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser, requireAdmin } from "@/lib/rbac";
import { logAccess } from "@/lib/access-log";
import { geocodeAddress } from "@/lib/fahrtenrechner/geocode";
import { resolveClientAddress } from "@/lib/client-address";
import type { CaseStatus } from "@prisma/client";

/** Vorbelegung Besuche/Monat für den automatisch angelegten "Zuhause"-Besuchsort bei Fallanlage
 * (entspricht ca. 1x/Woche, dem bisherigen Standardwert). Feintuning erfolgt danach im Fall selbst. */
const BESUCHSORT_BESUCHE_PRO_MONAT_DEFAULT = 4.33;

export type ActionState = { error?: string } | undefined;

export async function createCase(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();

  const existingClientId = String(formData.get("existingClientId") ?? "").trim();
  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const birthDate = String(formData.get("birthDate") ?? "").trim();
  const street = String(formData.get("street") ?? "").trim();
  const postalCodeCity = String(formData.get("postalCodeCity") ?? "").trim();
  const contactInfo = String(formData.get("contactInfo") ?? "").trim();

  const authority = String(formData.get("authority") ?? "").trim();
  const authorityStreet = String(formData.get("authorityStreet") ?? "").trim();
  const authorityPostalCodeCity = String(formData.get("authorityPostalCodeCity") ?? "").trim();
  const helpTypeId = String(formData.get("helpTypeId") ?? "").trim();
  const assignedEmployeeId = String(formData.get("assignedEmployeeId") ?? "").trim();
  const substituteEmployeeId = String(formData.get("substituteEmployeeId") ?? "").trim();
  const hoursContingent = Number(formData.get("hoursContingent") ?? 0);
  const contingentPeriodMonths = Number(formData.get("contingentPeriodMonths") ?? 0);
  const startDate = String(formData.get("startDate") ?? "").trim();
  const expectedEndDate = String(formData.get("expectedEndDate") ?? "").trim();
  const phaseOutWeeksStr = String(formData.get("phaseOutWeeks") ?? "").trim();
  const helpPlanMeetingDate = String(formData.get("helpPlanMeetingDate") ?? "").trim();
  const extensionDeadline = String(formData.get("extensionDeadline") ?? "").trim();
  const reminderLeadDays = Number(formData.get("reminderLeadDays") ?? 14);
  const geplanteFlsStdWocheStr = String(formData.get("geplanteFlsStdWoche") ?? "").trim();

  if (!authority || !helpTypeId || !assignedEmployeeId || !hoursContingent) {
    return { error: "Bitte alle Pflichtfelder ausfüllen." };
  }
  if (!contingentPeriodMonths || contingentPeriodMonths < 1 || contingentPeriodMonths > 24) {
    return { error: "Bitte einen Zeitraum zwischen 1 und 24 Monaten angeben." };
  }
  if (!existingClientId && (!firstName || !lastName)) {
    return { error: "Bitte einen Klienten auswählen oder neue Klientendaten angeben." };
  }
  let geplanteFlsStdWoche: number | null = null;
  if (geplanteFlsStdWocheStr) {
    geplanteFlsStdWoche = Number(geplanteFlsStdWocheStr.replace(",", "."));
    if (!Number.isFinite(geplanteFlsStdWoche) || geplanteFlsStdWoche < 0) {
      return { error: "Bitte eine gültige geplante FLS-Stundenzahl/Woche angeben." };
    }
  }

  const caseNumber = `AZ-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`.toUpperCase();

  let clientId = existingClientId;
  // Für den automatisch angelegten "Zuhause"-Besuchsort (siehe unten) - Adresse/Koordinaten der Klient*in.
  let zuhauseAdresse = "";
  let zuhauseLat: number | null = null;
  let zuhauseLng: number | null = null;

  if (!clientId) {
    // Fahrtenrechner-Referenzpunkt: Adresse einmalig geocodieren und dauerhaft speichern, kein
    // Blocker bei Fehlschlag (Fallback: manuelles Setzen der Koordinaten auf der Karte, siehe Prompt).
    zuhauseAdresse = street && postalCodeCity ? `${street}, ${postalCodeCity}` : street || postalCodeCity;
    const geocoded = zuhauseAdresse ? await geocodeAddress(zuhauseAdresse) : null;
    zuhauseLat = geocoded?.lat ?? null;
    zuhauseLng = geocoded?.lng ?? null;
    const client = await prisma.client.create({
      data: {
        firstName,
        lastName,
        birthDate: birthDate ? new Date(birthDate) : null,
        street: street || null,
        postalCodeCity: postalCodeCity || null,
        contactInfo: contactInfo || null,
        lat: zuhauseLat,
        lng: zuhauseLng,
        geocodedAt: geocoded ? new Date() : null,
      },
    });
    clientId = client.id;
    await logAccess({ userId: user.id, action: "CREATE", entityType: "Client", entityId: client.id });
  } else {
    const existingClient = await prisma.client.findUnique({ where: { id: clientId } });
    if (existingClient) {
      const resolved = resolveClientAddress(existingClient);
      zuhauseAdresse = [resolved.street, resolved.postalCodeCity].filter(Boolean).join(", ");
      if (existingClient.lat != null && existingClient.lng != null) {
        zuhauseLat = existingClient.lat.toNumber();
        zuhauseLng = existingClient.lng.toNumber();
      } else if (zuhauseAdresse) {
        const geocoded = await geocodeAddress(zuhauseAdresse);
        zuhauseLat = geocoded?.lat ?? null;
        zuhauseLng = geocoded?.lng ?? null;
      }
    }
  }

  const newCase = await prisma.case.create({
    data: {
      caseNumber,
      authority,
      authorityStreet: authorityStreet || null,
      authorityPostalCodeCity: authorityPostalCodeCity || null,
      clientId,
      helpTypeId,
      assignedEmployeeId,
      substituteEmployeeId: substituteEmployeeId || null,
      hoursContingent,
      contingentPeriodMonths,
      geplanteFlsStdWoche,
      startDate: startDate ? new Date(startDate) : new Date(),
      expectedEndDate: expectedEndDate ? new Date(expectedEndDate) : null,
      phaseOutWeeks: phaseOutWeeksStr ? Number(phaseOutWeeksStr) : null,
      helpPlanMeetingDate: helpPlanMeetingDate ? new Date(helpPlanMeetingDate) : null,
      extensionDeadline: extensionDeadline ? new Date(extensionDeadline) : null,
      reminderLeadDays: Number.isFinite(reminderLeadDays) && reminderLeadDays > 0 ? reminderLeadDays : 14,
      statusHistory: {
        create: { newStatus: "ACTIVE", reason: "Fall angelegt", changedById: user.id },
      },
    },
  });

  // Fahrten-/Fallrechner: ein Fall braucht mindestens einen Besuchsort - "Zuhause" wird aus der
  // Klientenadresse vorbefüllt (weitere Orte wie "Schule" werden danach im Fall selbst ergänzt).
  if (zuhauseAdresse) {
    await prisma.besuchsort.create({
      data: {
        caseId: newCase.id,
        bezeichnung: "Zuhause",
        adresse: zuhauseAdresse,
        lat: zuhauseLat,
        lng: zuhauseLng,
        geocodedAt: zuhauseLat != null ? new Date() : null,
        besucheProMonat: BESUCHSORT_BESUCHE_PRO_MONAT_DEFAULT,
      },
    });
  }

  await logAccess({ userId: user.id, action: "CREATE", entityType: "Case", entityId: newCase.id });
  revalidatePath("/dashboard");
  redirect(`/cases/${newCase.id}`);
}

export async function updateCaseCapacityFields(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const caseId = String(formData.get("caseId") ?? "");
  const expectedEndDate = String(formData.get("expectedEndDate") ?? "").trim();
  const phaseOutWeeksStr = String(formData.get("phaseOutWeeks") ?? "").trim();

  await prisma.case.update({
    where: { id: caseId },
    data: {
      expectedEndDate: expectedEndDate ? new Date(expectedEndDate) : null,
      phaseOutWeeks: phaseOutWeeksStr ? Number(phaseOutWeeksStr) : null,
    },
  });

  await logAccess({ userId: user.id, action: "UPDATE", entityType: "Case", entityId: caseId, details: "Kapazitätsplanung geändert" });
  revalidatePath(`/cases/${caseId}`);
  return undefined;
}

/** Fachliche Leistungszeit/Woche für den Fahrten-/Fallrechner - unabhängig von den Besuchsorten/der Fahrt. */
export async function updateCaseGeplanteFlsStdWoche(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const caseId = String(formData.get("caseId") ?? "");
  const geplanteFlsStdWocheStr = String(formData.get("geplanteFlsStdWoche") ?? "").trim();

  let geplanteFlsStdWoche: number | null = null;
  if (geplanteFlsStdWocheStr) {
    geplanteFlsStdWoche = Number(geplanteFlsStdWocheStr.replace(",", "."));
    if (!Number.isFinite(geplanteFlsStdWoche) || geplanteFlsStdWoche < 0) {
      return { error: "Bitte eine gültige geplante FLS-Stundenzahl/Woche angeben." };
    }
  }

  await prisma.case.update({ where: { id: caseId }, data: { geplanteFlsStdWoche } });
  await logAccess({ userId: user.id, action: "UPDATE", entityType: "Case", entityId: caseId, details: "Geplante FLS-Std./Woche geändert" });
  revalidatePath(`/cases/${caseId}`);
  revalidatePath("/admin/fahrtenrechner");
  return undefined;
}

/** Besuchsort hinzufügen (Fahrten-/Fallrechner) - Adresse wird beim Anlegen einmalig geocodiert. */
export async function addBesuchsort(
  caseId: string,
  bezeichnung: string,
  adresse: string,
  besucheProMonatStr: string
): Promise<{ error?: string } | undefined> {
  const user = await requireUser();
  const label = bezeichnung.trim();
  const address = adresse.trim();
  if (!label || !address) return { error: "Bitte Bezeichnung und Adresse angeben." };
  const besucheProMonat = Number(besucheProMonatStr.replace(",", "."));
  if (!Number.isFinite(besucheProMonat) || besucheProMonat < 0) {
    return { error: "Bitte eine gültige Anzahl Besuche/Monat angeben." };
  }

  const geocoded = await geocodeAddress(address);
  const count = await prisma.besuchsort.count({ where: { caseId } });
  await prisma.besuchsort.create({
    data: {
      caseId,
      bezeichnung: label,
      adresse: address,
      besucheProMonat,
      lat: geocoded?.lat ?? null,
      lng: geocoded?.lng ?? null,
      geocodedAt: geocoded ? new Date() : null,
      sortOrder: count,
    },
  });
  await logAccess({ userId: user.id, action: "CREATE", entityType: "Besuchsort", entityId: caseId, details: label });
  revalidatePath(`/cases/${caseId}`);
  revalidatePath("/admin/fahrtenrechner");
  return undefined;
}

/** Besuchsort bearbeiten - re-geocodiert nur, wenn sich die Adresse tatsächlich geändert hat. */
export async function updateBesuchsort(
  id: string,
  caseId: string,
  bezeichnung: string,
  adresse: string,
  besucheProMonatStr: string
): Promise<{ error?: string } | undefined> {
  const user = await requireUser();
  const label = bezeichnung.trim();
  const address = adresse.trim();
  if (!label || !address) return { error: "Bitte Bezeichnung und Adresse angeben." };
  const besucheProMonat = Number(besucheProMonatStr.replace(",", "."));
  if (!Number.isFinite(besucheProMonat) || besucheProMonat < 0) {
    return { error: "Bitte eine gültige Anzahl Besuche/Monat angeben." };
  }

  const existing = await prisma.besuchsort.findUnique({ where: { id } });
  if (!existing) return { error: "Besuchsort nicht gefunden." };

  let lat = existing.lat?.toNumber() ?? null;
  let lng = existing.lng?.toNumber() ?? null;
  let geocodedAt = existing.geocodedAt;
  if (address !== existing.adresse) {
    const geocoded = await geocodeAddress(address);
    if (!geocoded) {
      return {
        error: "Die Adresse konnte nicht automatisch gefunden werden. Bitte Schreibweise prüfen und erneut versuchen.",
      };
    }
    lat = geocoded.lat;
    lng = geocoded.lng;
    geocodedAt = new Date();
  }

  await prisma.besuchsort.update({ where: { id }, data: { bezeichnung: label, adresse: address, besucheProMonat, lat, lng, geocodedAt } });
  await logAccess({ userId: user.id, action: "UPDATE", entityType: "Besuchsort", entityId: id });
  revalidatePath(`/cases/${caseId}`);
  revalidatePath("/admin/fahrtenrechner");
  return undefined;
}

/** Besuchsort löschen - ein Fall muss mindestens einen behalten. */
export async function deleteBesuchsort(id: string, caseId: string): Promise<{ error?: string } | undefined> {
  const user = await requireUser();
  const count = await prisma.besuchsort.count({ where: { caseId } });
  if (count <= 1) return { error: "Ein Fall benötigt mindestens einen Besuchsort." };

  await prisma.besuchsort.delete({ where: { id } });
  await logAccess({ userId: user.id, action: "DELETE", entityType: "Besuchsort", entityId: id });
  revalidatePath(`/cases/${caseId}`);
  revalidatePath("/admin/fahrtenrechner");
  return undefined;
}

export async function updateCaseAuthorityFields(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const caseId = String(formData.get("caseId") ?? "");
  const authority = String(formData.get("authority") ?? "").trim();
  const authorityStreet = String(formData.get("authorityStreet") ?? "").trim();
  const authorityPostalCodeCity = String(formData.get("authorityPostalCodeCity") ?? "").trim();

  if (!authority) {
    return { error: "Bitte das zuständige Jugendamt/Auftraggeber angeben." };
  }

  await prisma.case.update({
    where: { id: caseId },
    data: {
      authority,
      authorityStreet: authorityStreet || null,
      authorityPostalCodeCity: authorityPostalCodeCity || null,
    },
  });

  await logAccess({ userId: user.id, action: "UPDATE", entityType: "Case", entityId: caseId, details: "Kostenträger/Rechnungsadresse geändert" });
  revalidatePath(`/cases/${caseId}`);
  return undefined;
}

/** Umsatz-Cockpit: Stundensatz pro Fall - null = Vorbelegung aus Settings.hourlyRate wird verwendet. */
export async function updateCaseStundensatz(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireAdmin();
  const caseId = String(formData.get("caseId") ?? "");
  const raw = String(formData.get("stundensatz") ?? "").trim();
  const stundensatz = raw ? Number(raw.replace(",", ".")) : null;

  if (raw && (!Number.isFinite(stundensatz) || stundensatz! < 0)) {
    return { error: "Bitte einen gültigen Stundensatz angeben." };
  }

  await prisma.case.update({ where: { id: caseId }, data: { stundensatz } });
  await logAccess({ userId: user.id, action: "UPDATE", entityType: "Case", entityId: caseId, details: "Stundensatz geändert" });
  revalidatePath(`/cases/${caseId}`);
  return undefined;
}

export async function updateCaseStatus(formData: FormData) {
  const user = await requireUser();
  const caseId = String(formData.get("caseId") ?? "");
  const newStatus = String(formData.get("newStatus") ?? "") as CaseStatus;
  const reason = String(formData.get("reason") ?? "").trim() || null;

  const existing = await prisma.case.findUnique({ where: { id: caseId } });
  if (!existing) return;

  await prisma.$transaction([
    prisma.case.update({
      where: { id: caseId },
      data: {
        status: newStatus,
        endDate: newStatus === "COMPLETED" ? new Date() : existing.endDate,
      },
    }),
    prisma.caseStatusHistory.create({
      data: { caseId, oldStatus: existing.status, newStatus, reason, changedById: user.id },
    }),
  ]);

  await logAccess({ userId: user.id, action: "UPDATE", entityType: "Case", entityId: caseId, details: `Status → ${newStatus}` });
  revalidatePath(`/cases/${caseId}`);
  revalidatePath("/dashboard");
}

export async function archiveCase(caseId: string) {
  const user = await requireUser();
  await prisma.case.update({ where: { id: caseId }, data: { archived: true } });
  await logAccess({ userId: user.id, action: "ARCHIVE", entityType: "Case", entityId: caseId });
  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function deleteCase(caseId: string): Promise<{ error?: string } | undefined> {
  const user = await requireAdmin();

  const caseRecord = await prisma.case.findUnique({ where: { id: caseId } });
  if (!caseRecord) return { error: "Fall nicht gefunden." };

  const [serviceEntryCount, appointmentCount, documentCount, messageCount, timeEntryCount] = await Promise.all([
    prisma.serviceEntry.count({ where: { caseId } }),
    prisma.appointment.count({ where: { caseId } }),
    prisma.document.count({ where: { caseId } }),
    prisma.message.count({ where: { caseId } }),
    prisma.timeEntry.count({ where: { caseId } }),
  ]);

  const totalEntries = serviceEntryCount + appointmentCount + documentCount + messageCount + timeEntryCount;
  if (totalEntries > 0) {
    return {
      error: `Diese Hilfe kann nicht gelöscht werden, da bereits ${totalEntries} zugehörige Einträge vorhanden sind (Leistungsdokumentation, Termine, Dokumente, Nachrichten oder Zeiterfassung). Bitte stattdessen archivieren.`,
    };
  }

  await prisma.$transaction([
    prisma.caseStatusHistory.deleteMany({ where: { caseId } }),
    prisma.case.delete({ where: { id: caseId } }),
  ]);

  await logAccess({ userId: user.id, action: "DELETE", entityType: "Case", entityId: caseId, details: caseRecord.caseNumber });
  revalidatePath("/dashboard");
  redirect("/dashboard");
}
