"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/rbac";
import { logAccess } from "@/lib/access-log";

export type ActionState = { error?: string; success?: string } | undefined;

export async function createSondertagTyp(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();

  const name = String(formData.get("name") ?? "").trim();
  const datumStr = String(formData.get("datum") ?? "");
  const dauerStd = Number(formData.get("dauerStd") ?? "");
  const istEchterExtraTag = formData.get("istEchterExtraTag") === "on";

  if (!name || !datumStr) return { error: "Bitte Name und Datum angeben." };
  if (!Number.isFinite(dauerStd) || dauerStd <= 0) return { error: "Bitte eine gültige Dauer angeben." };

  await prisma.sondertagTyp.create({ data: { name, datum: new Date(datumStr), dauerStd, istEchterExtraTag } });
  await logAccess({ userId: admin.id, action: "CREATE", entityType: "SondertagTyp", details: `${name} ${datumStr}` });
  revalidatePath("/admin/team-uebersicht");
  return { success: "Sondertag angelegt." };
}

export async function deleteSondertagTyp(id: string) {
  const admin = await requireAdmin();
  await prisma.sondertagTyp.delete({ where: { id } });
  await logAccess({ userId: admin.id, action: "DELETE", entityType: "SondertagTyp", entityId: id });
  revalidatePath("/admin/team-uebersicht");
}
