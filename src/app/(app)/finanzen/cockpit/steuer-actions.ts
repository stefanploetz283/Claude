"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/rbac";
import { logAccess } from "@/lib/access-log";
import { computeBerechneterAbzug } from "@/lib/steuerrechner";
import type { VorsorgeArt, PrivaterAbzugKategorie, Veranlagungsart } from "@prisma/client";

export type ActionState = { error?: string; success?: string } | undefined;

const VORSORGE_ARTEN = ["RUERUP_RENTE", "KRANKENVERSICHERUNG", "SONSTIGE"] as const;
const PRIVATER_ABZUG_KATEGORIEN = [
  "HANDWERKERLEISTUNGEN",
  "HAUSHALTSNAHE_DIENSTLEISTUNGEN",
  "HAUSHALTSNAHE_BESCHAEFTIGUNG",
  "KINDERBETREUUNG",
  "SCHULGELD",
  "AUSSERGEWOEHNLICHE_BELASTUNG",
  "SONSTIGES",
] as const;

export async function addVorsorgeaufwandEintrag(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const art = String(formData.get("art") ?? "");
  const gueltigAbStr = String(formData.get("gueltigAb") ?? "").trim();
  const betragStr = String(formData.get("betragMonatlich") ?? "").trim();

  if (!VORSORGE_ARTEN.includes(art as (typeof VORSORGE_ARTEN)[number])) return { error: "Bitte eine gültige Art wählen." };
  if (!gueltigAbStr) return { error: "Bitte ein Gültig-ab-Datum angeben." };
  const betrag = Number(betragStr.replace(",", "."));
  if (!Number.isFinite(betrag) || betrag < 0) return { error: "Bitte einen gültigen Betrag/Monat angeben." };

  await prisma.praxisVorsorgeaufwandEintrag.create({
    data: { art: art as VorsorgeArt, betragMonatlich: betrag, gueltigAb: new Date(gueltigAbStr) },
  });
  await logAccess({ userId: admin.id, action: "CREATE", entityType: "PraxisVorsorgeaufwandEintrag", details: `${art} ${betrag}€/Monat` });
  revalidatePath("/finanzen/cockpit");
  return { success: "Vorsorgeaufwand gespeichert." };
}

export async function deleteVorsorgeaufwandEintrag(id: string) {
  const admin = await requireAdmin();
  await prisma.praxisVorsorgeaufwandEintrag.delete({ where: { id } });
  await logAccess({ userId: admin.id, action: "DELETE", entityType: "PraxisVorsorgeaufwandEintrag", entityId: id });
  revalidatePath("/finanzen/cockpit");
}

export async function updateSteuereinstellungen(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const grenzsteuersatzStr = String(formData.get("persoenlicherGrenzsteuersatz") ?? "").trim();
  const veranlagungsart = String(formData.get("veranlagungsart") ?? "");
  const ehepartnerEinkommenStr = String(formData.get("ehepartnerEinkommenJahr") ?? "").trim();

  const grenzsteuersatz = Number(grenzsteuersatzStr.replace(",", "."));
  if (!Number.isFinite(grenzsteuersatz) || grenzsteuersatz < 0 || grenzsteuersatz > 100) {
    return { error: "Bitte einen gültigen Grenzsteuersatz (0-100 %) angeben." };
  }
  if (veranlagungsart !== "EINZELN" && veranlagungsart !== "ZUSAMMEN") return { error: "Bitte eine gültige Veranlagungsart wählen." };
  const ehepartnerEinkommenJahr = ehepartnerEinkommenStr ? Number(ehepartnerEinkommenStr.replace(",", ".")) : null;
  if (ehepartnerEinkommenJahr != null && (!Number.isFinite(ehepartnerEinkommenJahr) || ehepartnerEinkommenJahr < 0)) {
    return { error: "Bitte ein gültiges Partnereinkommen angeben." };
  }

  await prisma.praxisSteuereinstellungen.upsert({
    where: { id: "singleton" },
    update: { persoenlicherGrenzsteuersatz: grenzsteuersatz, veranlagungsart: veranlagungsart as Veranlagungsart, ehepartnerEinkommenJahr },
    create: { id: "singleton", persoenlicherGrenzsteuersatz: grenzsteuersatz, veranlagungsart: veranlagungsart as Veranlagungsart, ehepartnerEinkommenJahr },
  });
  await logAccess({ userId: admin.id, action: "UPDATE", entityType: "PraxisSteuereinstellungen" });
  revalidatePath("/finanzen/cockpit");
  return { success: "Gespeichert." };
}

export async function updatePrivaterAbzugKonfiguration(kategorie: string, prozentsatzStr: string, deckelStr: string): Promise<ActionState> {
  const admin = await requireAdmin();
  if (!PRIVATER_ABZUG_KATEGORIEN.includes(kategorie as (typeof PRIVATER_ABZUG_KATEGORIEN)[number])) return { error: "Ungültige Kategorie." };

  const prozentsatz = prozentsatzStr.trim() ? Number(prozentsatzStr.replace(",", ".")) : null;
  const deckelJahr = deckelStr.trim() ? Number(deckelStr.replace(",", ".")) : null;
  if (prozentsatz != null && (!Number.isFinite(prozentsatz) || prozentsatz < 0)) return { error: "Bitte einen gültigen Prozentsatz angeben." };
  if (deckelJahr != null && (!Number.isFinite(deckelJahr) || deckelJahr < 0)) return { error: "Bitte einen gültigen Deckel angeben." };

  await prisma.privaterAbzugKonfiguration.upsert({
    where: { kategorie: kategorie as PrivaterAbzugKategorie },
    update: { prozentsatz, deckelJahr },
    create: { kategorie: kategorie as PrivaterAbzugKategorie, prozentsatz, deckelJahr },
  });
  await logAccess({ userId: admin.id, action: "UPDATE", entityType: "PrivaterAbzugKonfiguration", details: kategorie });
  revalidatePath("/finanzen/cockpit");
  return undefined;
}

export async function addPrivaterAbzugEintrag(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const kategorie = String(formData.get("kategorie") ?? "");
  const jahr = Number(formData.get("jahr") ?? new Date().getFullYear());
  const betragStr = String(formData.get("eingegebenerBetrag") ?? "").trim();
  const notiz = String(formData.get("notiz") ?? "").trim();

  if (!PRIVATER_ABZUG_KATEGORIEN.includes(kategorie as (typeof PRIVATER_ABZUG_KATEGORIEN)[number])) return { error: "Bitte eine gültige Kategorie wählen." };
  const eingegebenerBetrag = Number(betragStr.replace(",", "."));
  if (!Number.isFinite(eingegebenerBetrag) || eingegebenerBetrag <= 0) return { error: "Bitte einen gültigen Betrag angeben." };

  const konfiguration = await prisma.privaterAbzugKonfiguration.findUnique({ where: { kategorie: kategorie as PrivaterAbzugKategorie } });
  const berechneterAbzug = computeBerechneterAbzug(eingegebenerBetrag, konfiguration?.prozentsatz?.toNumber() ?? null, konfiguration?.deckelJahr?.toNumber() ?? null);

  await prisma.praxisPrivaterAbzugEintrag.create({
    data: { kategorie: kategorie as PrivaterAbzugKategorie, jahr, eingegebenerBetrag, berechneterAbzug, notiz: notiz || null },
  });
  await logAccess({ userId: admin.id, action: "CREATE", entityType: "PraxisPrivaterAbzugEintrag", details: `${kategorie} ${eingegebenerBetrag}€` });
  revalidatePath("/finanzen/cockpit");
  return { success: "Eintrag gespeichert." };
}

export async function deletePrivaterAbzugEintrag(id: string) {
  const admin = await requireAdmin();
  await prisma.praxisPrivaterAbzugEintrag.delete({ where: { id } });
  await logAccess({ userId: admin.id, action: "DELETE", entityType: "PraxisPrivaterAbzugEintrag", entityId: id });
  revalidatePath("/finanzen/cockpit");
}

/** Forderungsmanagement: Rechnung manuell als bezahlt markieren - kein automatischer Bankabgleich. */
export async function markInvoiceAsBezahlt(id: string) {
  const admin = await requireAdmin();
  await prisma.invoice.update({ where: { id }, data: { status: "BEZAHLT", bezahltAm: new Date() } });
  await logAccess({ userId: admin.id, action: "UPDATE", entityType: "Invoice", entityId: id, details: "Als bezahlt markiert" });
  revalidatePath("/finanzen/cockpit");
  revalidatePath("/finanzen/rechnungen");
}
