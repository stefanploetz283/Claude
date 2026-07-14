import { prisma } from "@/lib/prisma";

export async function getCasesPerHelpType(year: number) {
  const cases = await prisma.case.findMany({
    where: { startDate: { gte: new Date(Date.UTC(year, 0, 1)), lt: new Date(Date.UTC(year + 1, 0, 1)) } },
    include: { helpType: true },
  });
  const map = new Map<string, number>();
  for (const c of cases) {
    map.set(c.helpType.name, (map.get(c.helpType.name) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .map(([helpType, count]) => ({ helpType, count }))
    .sort((a, b) => b.count - a.count);
}

export async function getAverageCaseDurationDays(year: number) {
  const completed = await prisma.case.findMany({
    where: {
      status: "COMPLETED",
      endDate: { gte: new Date(Date.UTC(year, 0, 1)), lt: new Date(Date.UTC(year + 1, 0, 1)), not: null },
    },
    select: { startDate: true, endDate: true },
  });
  if (completed.length === 0) return { averageDays: 0, count: 0 };
  const totalDays = completed.reduce((sum, c) => sum + (c.endDate!.getTime() - c.startDate.getTime()) / 86400000, 0);
  return { averageDays: totalDays / completed.length, count: completed.length };
}

export async function getMonthlyUtilization(year: number) {
  const entries = await prisma.serviceEntry.findMany({
    where: { date: { gte: new Date(Date.UTC(year, 0, 1)), lt: new Date(Date.UTC(year + 1, 0, 1)) } },
    select: { date: true, durationMinutes: true },
  });
  const months = Array.from({ length: 12 }, (_, i) => ({ month: i + 1, hours: 0 }));
  for (const e of entries) {
    months[e.date.getUTCMonth()].hours += e.durationMinutes / 60;
  }
  return months;
}

export async function getHoursPerEmployee(from: Date, to: Date) {
  const entries = await prisma.timeEntry.findMany({
    where: { date: { gte: from, lt: to } },
    include: { employee: true },
  });
  const map = new Map<string, { name: string; hours: number }>();
  for (const e of entries) {
    const existing = map.get(e.employeeId) ?? { name: e.employee.name, hours: 0 };
    existing.hours += e.durationMinutes / 60;
    map.set(e.employeeId, existing);
  }
  return Array.from(map.values()).sort((a, b) => b.hours - a.hours);
}

export async function getCasesWithLowContingent(thresholdPercent: number) {
  const cases = await prisma.case.findMany({
    where: { archived: false, status: { not: "COMPLETED" } },
    include: { client: true, assignedEmployee: true, helpType: true },
  });

  const grouped = await prisma.serviceEntry.groupBy({
    by: ["caseId"],
    where: { caseId: { in: cases.map((c) => c.id) } },
    _sum: { durationMinutes: true },
  });
  const usedMap = new Map(grouped.map((g) => [g.caseId, (g._sum.durationMinutes ?? 0) / 60]));

  return cases
    .map((c) => {
      const contingent = c.hoursContingent.toNumber();
      const used = usedMap.get(c.id) ?? 0;
      const remainingPercent = contingent > 0 ? ((contingent - used) / contingent) * 100 : 0;
      return { case: c, remainingPercent, remainingHours: contingent - used };
    })
    .filter((r) => r.remainingPercent <= thresholdPercent)
    .sort((a, b) => a.remainingPercent - b.remainingPercent);
}
