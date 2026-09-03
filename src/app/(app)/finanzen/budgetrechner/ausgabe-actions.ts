"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdminOrVerwaltung } from "@/lib/rbac";
import { logAccess } from "@/lib/access-log";

export type AusgabeActionState = { error?: string; success?: string } | undefined;

const BUDGET_PFAD = "/finanzen/budgetrechner";

function parseBetrag(raw: FormDataEntryValue | null): number | null {
  const s = String(raw ?? "").trim().replace(/\s|€/g, "");
  if (!s) return null;
  const normalized = s.includes(",") ? s.replace(/\./g, "").replace(",", ".") : s;
  const n = Number(normalized);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function revalidate() {
  revalidatePath(BUDGET_PFAD);
  revalidatePath(`${BUDGET_PFAD}/ausgaben`);
}

export async function createAusgabe(_prev: AusgabeActionState, formData: FormData): Promise<AusgabeActionState> {
  const user = await requireAdminOrVerwaltung();

  const betrag = parseBetrag(formData.get("betrag"));
  const datumStr = String(formData.get("datum") ?? "");
  const beschreibung = String(formData.get("beschreibung") ?? "").trim();
  const kategorieIdRaw = String(formData.get("kategorieId") ?? "");
  const reKoBudgetRelevant = formData.get("reKoBudgetRelevant") != null;

  if (betrag == null) return { error: "Bitte einen gültigen Betrag (> 0) angeben." };
  const datum = datumStr ? new Date(`${datumStr}T00:00:00.000Z`) : null;
  if (!datum || Number.isNaN(datum.getTime())) return { error: "Bitte ein gültiges Datum angeben." };
  if (!beschreibung) return { error: "Bitte eine Beschreibung angeben." };

  let kategorieId: string | null = null;
  if (kategorieIdRaw) {
    const kategorie = await prisma.budgetKategorie.findUnique({ where: { id: kategorieIdRaw } });
    if (!kategorie) return { error: "Gewählte Position nicht gefunden." };
    kategorieId = kategorie.id;
  }

  const ausgabe = await prisma.budgetAusgabe.create({
    data: { betrag, datum, beschreibung, quelle: "manuell", reKoBudgetRelevant, kategorieId },
  });

  await logAccess({ userId: user.id, action: "CREATE", entityType: "BudgetAusgabe", entityId: ausgabe.id, details: `${beschreibung} (${betrag} €)` });
  revalidate();
  return { success: kategorieId ? "Ausgabe erfasst." : "Ausgabe als nicht eingeplante Kosten erfasst." };
}

export async function updateAusgabe(_prev: AusgabeActionState, formData: FormData): Promise<AusgabeActionState> {
  const user = await requireAdminOrVerwaltung();

  const id = String(formData.get("id") ?? "");
  const betrag = parseBetrag(formData.get("betrag"));
  const datumStr = String(formData.get("datum") ?? "");
  const beschreibung = String(formData.get("beschreibung") ?? "").trim();
  const kategorieIdRaw = String(formData.get("kategorieId") ?? "");
  const reKoBudgetRelevant = formData.get("reKoBudgetRelevant") != null;

  const bestehend = await prisma.budgetAusgabe.findUnique({ where: { id } });
  if (!bestehend) return { error: "Ausgabe nicht gefunden." };
  if (betrag == null) return { error: "Bitte einen gültigen Betrag (> 0) angeben." };
  const datum = datumStr ? new Date(`${datumStr}T00:00:00.000Z`) : null;
  if (!datum || Number.isNaN(datum.getTime())) return { error: "Bitte ein gültiges Datum angeben." };
  if (!beschreibung) return { error: "Bitte eine Beschreibung angeben." };

  let kategorieId: string | null = null;
  if (kategorieIdRaw) {
    const kategorie = await prisma.budgetKategorie.findUnique({ where: { id: kategorieIdRaw } });
    if (!kategorie) return { error: "Gewählte Position nicht gefunden." };
    kategorieId = kategorie.id;
  }

  await prisma.budgetAusgabe.update({ where: { id }, data: { betrag, datum, beschreibung, reKoBudgetRelevant, kategorieId } });

  await logAccess({ userId: user.id, action: "UPDATE", entityType: "BudgetAusgabe", entityId: id, details: beschreibung });
  revalidate();
  return { success: "Ausgabe aktualisiert." };
}

export async function deleteAusgabe(id: string): Promise<AusgabeActionState> {
  const user = await requireAdminOrVerwaltung();
  const bestehend = await prisma.budgetAusgabe.findUnique({ where: { id } });
  if (!bestehend) return { error: "Ausgabe nicht gefunden." };

  await prisma.budgetAusgabe.delete({ where: { id } });
  await logAccess({ userId: user.id, action: "DELETE", entityType: "BudgetAusgabe", entityId: id, details: bestehend.beschreibung });
  revalidate();
  return { success: "Ausgabe gelöscht." };
}

/** ReKo-Budgetrelevanz einer Ausgabe umschalten (z.B. privat getragene, nur steuerlich relevante Buchung). */
export async function toggleReKoRelevant(id: string, wert: boolean): Promise<AusgabeActionState> {
  const user = await requireAdminOrVerwaltung();
  const bestehend = await prisma.budgetAusgabe.findUnique({ where: { id } });
  if (!bestehend) return { error: "Ausgabe nicht gefunden." };

  await prisma.budgetAusgabe.update({ where: { id }, data: { reKoBudgetRelevant: wert } });
  await logAccess({
    userId: user.id,
    action: "UPDATE",
    entityType: "BudgetAusgabe",
    entityId: id,
    details: `reKoBudgetRelevant → ${wert}`,
  });
  revalidate();
  return undefined;
}

/** Ausgabe einer anderen Position (oder „keine") zuweisen – aus der Kategorie-Detailansicht. */
export async function assignAusgabeKategorie(id: string, kategorieId: string | null): Promise<AusgabeActionState> {
  const user = await requireAdminOrVerwaltung();
  const bestehend = await prisma.budgetAusgabe.findUnique({ where: { id } });
  if (!bestehend) return { error: "Ausgabe nicht gefunden." };

  if (kategorieId) {
    const kategorie = await prisma.budgetKategorie.findUnique({ where: { id: kategorieId } });
    if (!kategorie) return { error: "Position nicht gefunden." };
  }

  await prisma.budgetAusgabe.update({ where: { id }, data: { kategorieId } });
  await logAccess({ userId: user.id, action: "UPDATE", entityType: "BudgetAusgabe", entityId: id, details: `Position → ${kategorieId ?? "keine"}` });
  revalidate();
  return undefined;
}
