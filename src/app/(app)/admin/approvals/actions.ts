"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/rbac";
import { logAccess } from "@/lib/access-log";

export type ActionState = { error?: string } | undefined;

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
