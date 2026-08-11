"use server";

import { prisma } from "@/lib/prisma";
import { requireUser, caseVisibilityWhere } from "@/lib/rbac";

export type GlobalDictateCaseOption = { id: string; clientName: string; helpTypeName: string };

/** Fallliste für die globalen Diktat-Buttons - bewusst erst bei Bedarf (Overlay öffnen) geladen, nicht
 * bei jedem Seitenaufruf im Layout. */
export async function getCaseOptionsForGlobalDictate(): Promise<GlobalDictateCaseOption[]> {
  const user = await requireUser();
  const cases = await prisma.case.findMany({
    where: { ...caseVisibilityWhere(user), status: { not: "COMPLETED" } },
    include: { client: true, helpType: true },
    orderBy: [{ client: { lastName: "asc" } }, { client: { firstName: "asc" } }],
  });
  return cases.map((c) => ({
    id: c.id,
    clientName: `${c.client.lastName}, ${c.client.firstName}`,
    helpTypeName: c.helpType.name,
  }));
}
