"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/rbac";
import { logAccess } from "@/lib/access-log";

export type ActionState = { error?: string } | undefined;

export async function sendMessage(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();

  const isBroadcast = formData.get("isBroadcast") === "on";
  const recipientId = String(formData.get("recipientId") ?? "").trim();
  const subject = String(formData.get("subject") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const caseId = String(formData.get("caseId") ?? "").trim() || null;

  if (!subject || !body) return { error: "Bitte Betreff und Nachricht angeben." };
  if (!isBroadcast && !recipientId) return { error: "Bitte einen Empfänger auswählen oder Rundschreiben aktivieren." };

  let recipientIds: string[];
  if (isBroadcast) {
    const others = await prisma.user.findMany({ where: { active: true, id: { not: user.id } }, select: { id: true } });
    recipientIds = others.map((o) => o.id);
    if (recipientIds.length === 0) return { error: "Es gibt keine weiteren aktiven Mitarbeiter." };
  } else {
    recipientIds = [recipientId];
  }

  const message = await prisma.message.create({
    data: {
      senderId: user.id,
      subject,
      body,
      isBroadcast,
      caseId,
      recipients: { create: recipientIds.map((id) => ({ recipientId: id })) },
    },
  });

  await logAccess({ userId: user.id, action: "CREATE", entityType: "Message", entityId: message.id });
  revalidatePath("/messages");
  redirect(`/messages/${message.id}`);
}
