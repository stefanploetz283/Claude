"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdminOrVerwaltung } from "@/lib/rbac";
import { logAccess } from "@/lib/access-log";

export type KategorieActionState = { error?: string; success?: string } | undefined;

function parseBetrag(raw: FormDataEntryValue | null): number | null {
  const s = String(raw ?? "").trim().replace(/\s|€/g, "");
  if (!s) return null;
  const normalized = s.includes(",") ? s.replace(/\./g, "").replace(",", ".") : s;
  const n = Number(normalized);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function parseStichwoerter(raw: FormDataEntryValue | null): string[] {
  return String(raw ?? "")
    .split(/[,;\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

const BUDGET_PFAD = "/finanzen/budgetrechner";

export async function createKategorie(_prev: KategorieActionState, formData: FormData): Promise<KategorieActionState> {
  const user = await requireAdminOrVerwaltung();

  const name = String(formData.get("name") ?? "").trim();
  const jahr = Number(formData.get("jahr"));
  const jahresbudget = parseBetrag(formData.get("jahresbudget"));

  if (!name) return { error: "Bitte einen Namen angeben." };
  if (!Number.isInteger(jahr) || jahr < 2000 || jahr > 2100) return { error: "Bitte ein gültiges Jahr angeben." };
  if (jahresbudget == null) return { error: "Bitte ein gültiges Jahresbudget (≥ 0) angeben." };

  const vorhanden = await prisma.budgetKategorie.findUnique({ where: { name_jahr: { name, jahr } } });
  if (vorhanden) return { error: `Für ${jahr} gibt es bereits eine Position „${name}".` };

  const kategorie = await prisma.budgetKategorie.create({
    data: { name, jahr, jahresbudget, quelle: "manuell", stichwoerter: parseStichwoerter(formData.get("stichwoerter")) },
  });

  await logAccess({ userId: user.id, action: "CREATE", entityType: "BudgetKategorie", entityId: kategorie.id, details: `${name} (${jahr})` });
  revalidatePath(BUDGET_PFAD);
  revalidatePath(`${BUDGET_PFAD}/kategorien`);
  return { success: `Position „${name}" angelegt.` };
}

export async function updateKategorie(_prev: KategorieActionState, formData: FormData): Promise<KategorieActionState> {
  const user = await requireAdminOrVerwaltung();

  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const jahresbudget = parseBetrag(formData.get("jahresbudget"));

  const kategorie = await prisma.budgetKategorie.findUnique({ where: { id } });
  if (!kategorie) return { error: "Position nicht gefunden." };
  if (!name) return { error: "Bitte einen Namen angeben." };
  if (jahresbudget == null) return { error: "Bitte ein gültiges Jahresbudget (≥ 0) angeben." };

  if (name !== kategorie.name) {
    const kollision = await prisma.budgetKategorie.findUnique({ where: { name_jahr: { name, jahr: kategorie.jahr } } });
    if (kollision) return { error: `Für ${kategorie.jahr} gibt es bereits eine Position „${name}".` };
  }

  await prisma.budgetKategorie.update({
    where: { id },
    data: { name, jahresbudget, stichwoerter: parseStichwoerter(formData.get("stichwoerter")) },
  });

  await logAccess({ userId: user.id, action: "UPDATE", entityType: "BudgetKategorie", entityId: id, details: name });
  revalidatePath(BUDGET_PFAD);
  revalidatePath(`${BUDGET_PFAD}/kategorien`);
  return { success: "Position aktualisiert." };
}

export async function deleteKategorie(id: string): Promise<KategorieActionState> {
  const user = await requireAdminOrVerwaltung();

  const kategorie = await prisma.budgetKategorie.findUnique({ where: { id }, include: { _count: { select: { ausgaben: true } } } });
  if (!kategorie) return { error: "Position nicht gefunden." };

  // Zugeordnete Ausgaben bleiben erhalten (onDelete: SetNull) und wandern in „nicht eingeplante Kosten".
  await prisma.budgetKategorie.delete({ where: { id } });

  await logAccess({
    userId: user.id,
    action: "DELETE",
    entityType: "BudgetKategorie",
    entityId: id,
    details: `${kategorie.name} (${kategorie.jahr}) – ${kategorie._count.ausgaben} Ausgabe(n) nun ohne Position`,
  });
  revalidatePath(BUDGET_PFAD);
  revalidatePath(`${BUDGET_PFAD}/kategorien`);
  return { success: `Position „${kategorie.name}" gelöscht.` };
}
