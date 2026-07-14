import { prisma } from "@/lib/prisma";
import { Decimal } from "@prisma/client/runtime/library";

export async function getRemainingHours(caseId: string, hoursContingent: Decimal | number) {
  const total = await prisma.serviceEntry.aggregate({
    where: { caseId },
    _sum: { durationMinutes: true },
  });
  const usedMinutes = total._sum.durationMinutes ?? 0;
  const usedHours = usedMinutes / 60;
  const contingent = typeof hoursContingent === "number" ? hoursContingent : hoursContingent.toNumber();
  return {
    contingent,
    usedHours,
    remainingHours: contingent - usedHours,
    remainingPercent: contingent > 0 ? ((contingent - usedHours) / contingent) * 100 : 0,
  };
}

export async function getMonthlyHours(caseId: string) {
  const entries = await prisma.serviceEntry.findMany({
    where: { caseId },
    select: { date: true, durationMinutes: true },
    orderBy: { date: "asc" },
  });

  const map = new Map<string, number>();
  for (const entry of entries) {
    const key = `${entry.date.getUTCFullYear()}-${String(entry.date.getUTCMonth() + 1).padStart(2, "0")}`;
    map.set(key, (map.get(key) ?? 0) + entry.durationMinutes / 60);
  }

  return Array.from(map.entries())
    .map(([month, hours]) => ({ month, hours }))
    .sort((a, b) => (a.month < b.month ? 1 : -1));
}

export async function getRemainingHoursBulk(caseIds: string[]) {
  const grouped = await prisma.serviceEntry.groupBy({
    by: ["caseId"],
    where: { caseId: { in: caseIds } },
    _sum: { durationMinutes: true },
  });
  const map = new Map<string, number>();
  for (const row of grouped) {
    map.set(row.caseId, (row._sum.durationMinutes ?? 0) / 60);
  }
  return map;
}
