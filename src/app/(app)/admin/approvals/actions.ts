"use server";

import { revalidatePath } from "next/cache";
import { format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/rbac";
import { logAccess } from "@/lib/access-log";
import { monthDateRange } from "@/lib/date";
import type { ServiceEntryChangeField } from "@prisma/client";

export type ActionState = { error?: string } | undefined;

function combineDateTime(dateStr: string, timeStr: string) {
  return new Date(`${dateStr}T${timeStr}:00`);
}

/** 0,25-Std.-Schritte (15 Minuten) - bewusst nur für die Admin-Direktkorrektur im Freigaben-Bereich,
 * damit die dort korrigierten Zeiten klare Abrechnungswerte ergeben. Die eigene Erfassung der Fachkraft
 * (updateServiceEntry) bleibt minutengenau, das ist hier unverändert. */
function roundToQuarterHour(minutes: number): number {
  return Math.round(minutes / 15) * 15;
}

const timeLabel = (date: Date) => format(date, "HH:mm");

export async function approveMonth(caseId: string, year: number, month: number) {
  const user = await requireAdmin();

  await prisma.monthlyApproval.update({
    where: { caseId_year_month: { caseId, year, month } },
    data: { status: "FREIGEGEBEN", reviewedById: user.id, reviewedAt: new Date(), correctionNote: null },
  });

  await logAccess({
    userId: user.id,
    action: "UPDATE",
    entityType: "MonthlyApproval",
    entityId: caseId,
    details: `Freigegeben ${month}/${year}`,
  });
  revalidatePath("/admin/approvals");
  revalidatePath(`/cases/${caseId}/service-entries`);
  revalidatePath("/finanzen/rechnungen");
}

export async function requestCorrection(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const caseId = String(formData.get("caseId") ?? "");
  const year = Number(formData.get("year") ?? 0);
  const month = Number(formData.get("month") ?? 0);
  const comment = String(formData.get("comment") ?? "").trim();

  if (!year || !month) return { error: "Ungültiger Zeitraum." };
  if (!comment) return { error: "Bitte einen Korrekturhinweis angeben." };

  const user = await requireAdmin();

  await prisma.monthlyApproval.update({
    where: { caseId_year_month: { caseId, year, month } },
    data: { status: "KORREKTUR_ANGEFORDERT", reviewedById: user.id, reviewedAt: new Date(), correctionNote: comment },
  });

  await logAccess({
    userId: user.id,
    action: "UPDATE",
    entityType: "MonthlyApproval",
    entityId: caseId,
    details: `Korrektur angefordert ${month}/${year}`,
  });
  revalidatePath("/admin/approvals");
  revalidatePath(`/cases/${caseId}/service-entries`);
}

/**
 * Admin-Direktkorrektur einer einzelnen Dokumentationszeile im Freigaben-Bereich - dritter Weg neben
 * "Freigeben" und "Korrektur anfordern". Protokolliert nur Felder, die sich tatsächlich geändert haben
 * (kein Log-Eintrag bei reinem Öffnen/Speichern ohne Änderung), und nur solange die Dokumentation noch
 * nicht freigegeben ist (serverseitig geprüft, nicht nur über die UI verborgen).
 */
export async function adminUpdateServiceEntry(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const caseId = String(formData.get("caseId") ?? "");
  const year = Number(formData.get("year") ?? 0);
  const month = Number(formData.get("month") ?? 0);
  const dateStr = String(formData.get("date") ?? "");
  const startTimeStr = String(formData.get("startTime") ?? "");
  const endTimeStr = String(formData.get("endTime") ?? "");
  const description = String(formData.get("description") ?? "").trim();

  if (!dateStr || !startTimeStr || !endTimeStr) return { error: "Bitte Datum und Zeiten angeben." };
  if (!description) return { error: "Die Bemerkung darf nicht leer sein." };

  const newStartTime = combineDateTime(dateStr, startTimeStr);
  const newEndTime = combineDateTime(dateStr, endTimeStr);
  if (newEndTime.getTime() <= newStartTime.getTime()) {
    return { error: "Die Endzeit muss nach der Startzeit liegen." };
  }

  const approval = await prisma.monthlyApproval.findUnique({ where: { caseId_year_month: { caseId, year, month } } });
  if (!approval || approval.status !== "WARTET_AUF_FREIGABE") {
    return { error: "Diese Dokumentation ist nicht mehr zur Bearbeitung freigegeben." };
  }

  const entry = await prisma.serviceEntry.findUnique({ where: { id } });
  if (!entry || entry.caseId !== caseId) return { error: "Eintrag nicht gefunden." };

  const durationMinutes = roundToQuarterHour(Math.round((newEndTime.getTime() - newStartTime.getTime()) / 60000));

  const changes: { field: ServiceEntryChangeField; oldValue: string; newValue: string }[] = [];

  const oldDateLabel = format(entry.date, "dd.MM.yyyy");
  const newDateLabel = format(new Date(dateStr), "dd.MM.yyyy");
  if (oldDateLabel !== newDateLabel) {
    changes.push({ field: "DATUM", oldValue: oldDateLabel, newValue: newDateLabel });
  }

  const oldZeitLabel = `${timeLabel(entry.startTime)}–${timeLabel(entry.endTime)}`;
  const newZeitLabel = `${timeLabel(newStartTime)}–${timeLabel(newEndTime)}`;
  if (oldZeitLabel !== newZeitLabel) {
    changes.push({ field: "ZEIT", oldValue: oldZeitLabel, newValue: newZeitLabel });
  }

  if (entry.description !== description) {
    changes.push({ field: "BEMERKUNG", oldValue: entry.description, newValue: description });
  }

  if (changes.length === 0) {
    // Nichts geändert - weder Protokolleintrag noch "zuletzt bearbeitet"-Stempel, siehe Testfall 2 im Prompt.
    return undefined;
  }

  await prisma.$transaction([
    prisma.serviceEntry.update({
      where: { id },
      data: { date: new Date(dateStr), startTime: newStartTime, endTime: newEndTime, durationMinutes, description },
    }),
    prisma.serviceEntryChangeLog.createMany({
      data: changes.map((c) => ({ entryId: id, changedById: user.id, field: c.field, oldValue: c.oldValue, newValue: c.newValue })),
    }),
    prisma.monthlyApproval.update({
      where: { caseId_year_month: { caseId, year, month } },
      data: { lastEditedById: user.id, lastEditedAt: new Date() },
    }),
  ]);

  await logAccess({
    userId: user.id,
    action: "UPDATE",
    entityType: "ServiceEntry",
    entityId: id,
    details: `Admin-Korrektur im Freigaben-Bereich (${changes.map((c) => c.field).join(", ")})`,
  });

  revalidatePath("/admin/approvals");
  revalidatePath(`/cases/${caseId}/service-entries`);
  return undefined;
}

export type ChangeHistoryEntry = {
  id: string;
  changedAt: string;
  changedByName: string;
  field: ServiceEntryChangeField;
  oldValue: string;
  newValue: string;
};

/** Änderungshistorie einer Dokumentation (alle Fälle-Einträge dieses Monats), chronologisch. Wird erst
 * bei Klick auf das Verlauf-Icon geladen, nicht standardmäßig mitgeschickt. */
export async function getChangeHistory(caseId: string, year: number, month: number): Promise<ChangeHistoryEntry[]> {
  await requireAdmin();
  const { from, to } = monthDateRange(year, month);

  const logs = await prisma.serviceEntryChangeLog.findMany({
    where: { entry: { caseId, date: { gte: from, lte: to } } },
    include: { changedBy: true },
    orderBy: { changedAt: "asc" },
  });

  return logs.map((l) => ({
    id: l.id,
    changedAt: format(l.changedAt, "dd.MM.yyyy HH:mm"),
    changedByName: l.changedBy.name ?? "Admin",
    field: l.field,
    oldValue: l.oldValue,
    newValue: l.newValue,
  }));
}
