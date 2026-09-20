import { prisma } from "@/lib/prisma";
import type { Session } from "next-auth";
import type { Prisma } from "@prisma/client";

/**
 * Eigene Aufgaben eines Nutzers. Verwaltung sieht bewusst nur fallungebundene Aufgaben (caseId: null) -
 * dieselbe Grenze wie bei caseVisibilityWhere in rbac.ts, nur für Aufgaben statt Fälle.
 */
export async function getOwnAufgaben(user: Session["user"], options?: { includeErledigt?: boolean }) {
  const where: Prisma.AufgabeWhereInput = { zugewiesenAnId: user.id };
  if (user.role === "VERWALTUNG") where.caseId = null;
  if (!options?.includeErledigt) where.erledigt = false;

  return prisma.aufgabe.findMany({
    where,
    include: { case: { include: { client: true } } },
    orderBy: [{ faelligAm: "asc" }, { createdAt: "desc" }],
  });
}

export async function countOpenAufgaben(user: Session["user"]) {
  const where: Prisma.AufgabeWhereInput = { zugewiesenAnId: user.id, erledigt: false };
  if (user.role === "VERWALTUNG") where.caseId = null;
  return prisma.aufgabe.count({ where });
}
