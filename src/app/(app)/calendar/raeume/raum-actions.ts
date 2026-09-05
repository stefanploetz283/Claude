"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdminOrVerwaltung } from "@/lib/rbac";
import { logAccess } from "@/lib/access-log";
import type { PrimaerStandort } from "@prisma/client";

const PFAD = "/calendar/raeume";
const STANDORTE = ["NITTENDORF", "REGENSBURG"] as const;

export type RaumActionState = { error?: string } | undefined;

export async function createRaum(_prev: RaumActionState, formData: FormData): Promise<RaumActionState> {
  const user = await requireAdminOrVerwaltung();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Bitte einen Namen angeben." };
  const standortRaw = String(formData.get("standort") ?? "");
  const standort = (STANDORTE as readonly string[]).includes(standortRaw) ? (standortRaw as PrimaerStandort) : null;

  const raum = await prisma.raum.create({ data: { name, standort } });
  await logAccess({ userId: user.id, action: "CREATE", entityType: "Raum", entityId: raum.id, details: name });
  revalidatePath(PFAD);
}

export async function updateRaum(_prev: RaumActionState, formData: FormData): Promise<RaumActionState> {
  const user = await requireAdminOrVerwaltung();
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!id || !name) return { error: "Bitte einen Namen angeben." };
  const standortRaw = String(formData.get("standort") ?? "");
  const standort = (STANDORTE as readonly string[]).includes(standortRaw) ? (standortRaw as PrimaerStandort) : null;

  await prisma.raum.update({ where: { id }, data: { name, standort } });
  await logAccess({ userId: user.id, action: "UPDATE", entityType: "Raum", entityId: id });
  revalidatePath(PFAD);
}

/** Deaktivieren statt löschen, damit die Historie vergangener Termine mit diesem Raum erhalten bleibt. */
export async function toggleRaumAktiv(id: string, aktiv: boolean): Promise<void> {
  const user = await requireAdminOrVerwaltung();
  await prisma.raum.update({ where: { id }, data: { aktiv } });
  await logAccess({ userId: user.id, action: "UPDATE", entityType: "Raum", entityId: id, details: aktiv ? "Aktiviert" : "Deaktiviert" });
  revalidatePath(PFAD);
}
