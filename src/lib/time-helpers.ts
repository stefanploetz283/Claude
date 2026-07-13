import { prisma } from "@/lib/prisma";

export async function getRunningTimeEntry(employeeId: string) {
  return prisma.timeEntry.findFirst({
    where: { employeeId, source: "TIMER", endTime: null },
    orderBy: { createdAt: "desc" },
  });
}

export function monthRange(year: number, month: number) {
  const from = new Date(Date.UTC(year, month - 1, 1));
  const to = new Date(Date.UTC(year, month, 1));
  return { from, to };
}
