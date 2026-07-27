"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/rbac";
import { logAccess } from "@/lib/access-log";
import { uploadFile, buildStorageKey } from "@/lib/storage";

export type ActionState = { error?: string; success?: string } | undefined;

export async function updateSettings(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();

  const practiceName = String(formData.get("practiceName") ?? "").trim();
  const practiceAddress = String(formData.get("practiceAddress") ?? "").trim();
  const practicePhone = String(formData.get("practicePhone") ?? "").trim();
  const practiceEmail = String(formData.get("practiceEmail") ?? "").trim();
  const colorPrimary = String(formData.get("colorPrimary") ?? "").trim();
  const colorAccentLight = String(formData.get("colorAccentLight") ?? "").trim();
  const colorTextDark = String(formData.get("colorTextDark") ?? "").trim();
  const hourlyRateStr = String(formData.get("hourlyRate") ?? "").trim();
  const contingentWarningThreshold = Number(formData.get("contingentWarningThreshold") ?? 10);
  const sessionIdleTimeoutMinutes = Number(formData.get("sessionIdleTimeoutMinutes") ?? 20);
  const employeesCanContributeKnowledge = formData.get("employeesCanContributeKnowledge") === "on";
  const logo = formData.get("logo");

  const billableCapacityFactorStr = String(formData.get("billableCapacityFactor") ?? "").trim();
  const defaultPhaseOutWeeksStr = String(formData.get("defaultPhaseOutWeeks") ?? "").trim();
  const targetParallelCasesAtFullTimeStr = String(formData.get("targetParallelCasesAtFullTime") ?? "").trim();

  if (!practiceName) return { error: "Bitte einen Praxisnamen angeben." };

  const hourlyRate = hourlyRateStr ? Number(hourlyRateStr) : null;
  if (hourlyRateStr && (!Number.isFinite(hourlyRate) || hourlyRate! < 0)) {
    return { error: "Bitte einen gültigen Stundensatz angeben." };
  }

  const billableCapacityFactor = billableCapacityFactorStr ? Number(billableCapacityFactorStr) : undefined;
  const defaultPhaseOutWeeks = defaultPhaseOutWeeksStr ? Number(defaultPhaseOutWeeksStr) : undefined;
  const targetParallelCasesAtFullTime = targetParallelCasesAtFullTimeStr ? Number(targetParallelCasesAtFullTimeStr) : undefined;
  if (billableCapacityFactor !== undefined && (!Number.isFinite(billableCapacityFactor) || billableCapacityFactor <= 0)) {
    return { error: "Bitte einen gültigen Kapazitätsfaktor angeben." };
  }

  let logoUrl: string | undefined;
  if (logo instanceof File && logo.size > 0) {
    if (!logo.type.startsWith("image/")) return { error: "Das Logo muss eine Bilddatei sein." };
    const buffer = Buffer.from(await logo.arrayBuffer());
    const key = buildStorageKey("branding", logo.name);
    try {
      await uploadFile(key, buffer, logo.type);
      logoUrl = key;
    } catch {
      return { error: "Logo-Upload fehlgeschlagen. Bitte Speicherkonfiguration prüfen." };
    }
  }

  await prisma.settings.update({
    where: { id: "singleton" },
    data: {
      practiceName,
      practiceAddress: practiceAddress || null,
      practicePhone: practicePhone || null,
      practiceEmail: practiceEmail || null,
      colorPrimary: colorPrimary || undefined,
      colorAccentLight: colorAccentLight || undefined,
      colorTextDark: colorTextDark || undefined,
      hourlyRate,
      billableCapacityFactor,
      defaultPhaseOutWeeks: Number.isFinite(defaultPhaseOutWeeks) ? defaultPhaseOutWeeks : undefined,
      targetParallelCasesAtFullTime: Number.isFinite(targetParallelCasesAtFullTime) ? targetParallelCasesAtFullTime : undefined,
      contingentWarningThreshold: Number.isFinite(contingentWarningThreshold) ? contingentWarningThreshold : undefined,
      sessionIdleTimeoutMinutes: Number.isFinite(sessionIdleTimeoutMinutes) ? sessionIdleTimeoutMinutes : undefined,
      employeesCanContributeKnowledge,
      ...(logoUrl ? { logoUrl } : {}),
    },
  });

  await logAccess({ userId: admin.id, action: "UPDATE", entityType: "Settings" });
  revalidatePath("/", "layout");
  return { success: "Einstellungen gespeichert." };
}
