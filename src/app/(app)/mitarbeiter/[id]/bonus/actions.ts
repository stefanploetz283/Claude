"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/rbac";
import { logAccess } from "@/lib/access-log";
import type { Quarter } from "@/lib/bonus";

export async function markBonusPaidOut(employeeId: string, year: number, quarter: Quarter) {
  const admin = await requireAdmin();
  await prisma.quarterlyBonusPayout.upsert({
    where: { employeeId_year_quarter: { employeeId, year, quarter } },
    update: {},
    create: { employeeId, year, quarter, paidOutById: admin.id },
  });
  await logAccess({
    userId: admin.id,
    action: "UPDATE",
    entityType: "QuarterlyBonusPayout",
    entityId: employeeId,
    details: `Q${quarter}/${year} als ausgezahlt markiert`,
  });
  revalidatePath(`/mitarbeiter/${employeeId}/bonus`);
}

export async function toggleGutscheinBeschafft(id: string, employeeId: string, beschafft: boolean) {
  const admin = await requireAdmin();
  await prisma.gutscheinAuswahl.update({ where: { id }, data: { beschafft } });
  await logAccess({
    userId: admin.id,
    action: "UPDATE",
    entityType: "GutscheinAuswahl",
    entityId: id,
    details: beschafft ? "Als beschafft markiert" : "Beschaffung zurückgesetzt",
  });
  revalidatePath(`/mitarbeiter/${employeeId}/bonus`);
}
