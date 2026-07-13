import { prisma } from "@/lib/prisma";
import type { $Enums } from "@prisma/client";

export async function logAccess(params: {
  userId: string;
  action: $Enums.AccessAction;
  entityType: string;
  entityId?: string;
  details?: string;
}) {
  await prisma.accessLog.create({
    data: {
      userId: params.userId,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      details: params.details,
    },
  });
}
