"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/rbac";
import { logAccess } from "@/lib/access-log";

export type ActionState = { error?: string } | undefined;

// ---------- Fachliche Konzeption (Singleton) ----------

export async function updateFachlicheKonzeption(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const text = String(formData.get("text") ?? "").trim();

  await prisma.praxisFachlicheKonzeption.upsert({
    where: { id: "singleton" },
    update: { text },
    create: { id: "singleton", text },
  });
  await logAccess({ userId: admin.id, action: "UPDATE", entityType: "PraxisFachlicheKonzeption" });
  revalidatePath("/admin/abschlussbericht");
  return undefined;
}

// ---------- Begriffsglossar ----------

export async function addGlossarBegriff(begriff: string, definition: string): Promise<{ error?: string } | undefined> {
  const admin = await requireAdmin();
  const b = begriff.trim();
  const d = definition.trim();
  if (!b || !d) return { error: "Bitte Begriff und Definition angeben." };

  const existing = await prisma.praxisGlossarBegriff.findUnique({ where: { begriff: b } });
  if (existing) return { error: "Dieser Begriff existiert bereits." };

  const count = await prisma.praxisGlossarBegriff.count();
  await prisma.praxisGlossarBegriff.create({ data: { begriff: b, definition: d, sortOrder: count } });
  await logAccess({ userId: admin.id, action: "CREATE", entityType: "PraxisGlossarBegriff", details: b });
  revalidatePath("/admin/abschlussbericht");
  return undefined;
}

export async function updateGlossarBegriff(id: string, begriff: string, definition: string): Promise<{ error?: string } | undefined> {
  const admin = await requireAdmin();
  const b = begriff.trim();
  const d = definition.trim();
  if (!b || !d) return { error: "Bitte Begriff und Definition angeben." };

  await prisma.praxisGlossarBegriff.update({ where: { id }, data: { begriff: b, definition: d } });
  await logAccess({ userId: admin.id, action: "UPDATE", entityType: "PraxisGlossarBegriff", entityId: id });
  revalidatePath("/admin/abschlussbericht");
  return undefined;
}

export async function deleteGlossarBegriff(id: string) {
  const admin = await requireAdmin();
  await prisma.praxisGlossarBegriff.delete({ where: { id } });
  await logAccess({ userId: admin.id, action: "DELETE", entityType: "PraxisGlossarBegriff", entityId: id });
  revalidatePath("/admin/abschlussbericht");
}

// ---------- Referenzberichte-Bibliothek ----------

/** Ersetzt jedes angegebene Namens-Vorkommen durch den zugehörigen Platzhalter (einfacher Text-Ersatz,
 * kein Regex, damit Sonderzeichen in Namen nicht versehentlich als Muster interpretiert werden). */
function pseudonymisiere(text: string, ersetzungen: { name: string; platzhalter: string }[]): string {
  let result = text;
  for (const { name, platzhalter } of ersetzungen) {
    if (!name.trim()) continue;
    result = result.split(name).join(platzhalter);
  }
  return result;
}

export async function addReferenzbericht(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const titel = String(formData.get("titel") ?? "").trim();
  const originaltext = String(formData.get("originaltext") ?? "").trim();
  const namen = formData.getAll("ersetzungName").map((v) => String(v));
  const platzhalter = formData.getAll("ersetzungPlatzhalter").map((v) => String(v));

  if (!titel || !originaltext) return { error: "Bitte Titel und Text angeben." };

  const ersetzungen = namen.map((name, i) => ({
    name: name.trim(),
    platzhalter: platzhalter[i]?.trim() || `[Person ${i + 1}]`,
  }));
  const pseudonymisiertText = pseudonymisiere(originaltext, ersetzungen);

  // Bewusst wird NUR die pseudonymisierte Fassung gespeichert - das Original mit den echten Namen wird
  // an keiner Stelle persistiert (siehe Prompt-Rückmeldung zur Pseudonymisierungs-Frage).
  const created = await prisma.referenzbericht.create({
    data: { titel, text: pseudonymisiertText, erstelltVonId: admin.id },
  });
  await logAccess({ userId: admin.id, action: "CREATE", entityType: "Referenzbericht", entityId: created.id, details: titel });
  revalidatePath("/admin/abschlussbericht");
  return undefined;
}

export async function setReferenzberichtFreigegeben(id: string, freigegeben: boolean) {
  const admin = await requireAdmin();
  await prisma.referenzbericht.update({ where: { id }, data: { freigegeben } });
  await logAccess({
    userId: admin.id,
    action: "UPDATE",
    entityType: "Referenzbericht",
    entityId: id,
    details: freigegeben ? "Freigegeben" : "Freigabe entzogen",
  });
  revalidatePath("/admin/abschlussbericht");
}

export async function deleteReferenzbericht(id: string) {
  const admin = await requireAdmin();
  await prisma.referenzbericht.delete({ where: { id } });
  await logAccess({ userId: admin.id, action: "DELETE", entityType: "Referenzbericht", entityId: id });
  revalidatePath("/admin/abschlussbericht");
}

// ---------- Obergrenze gleichzeitig genutzter Referenzberichte (Settings) ----------

export async function updateBerichtReferenzberichteMaxAnzahl(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const raw = String(formData.get("berichtReferenzberichteMaxAnzahl") ?? "").trim();
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 1) return { error: "Bitte eine gültige Anzahl (mind. 1) angeben." };

  await prisma.settings.upsert({
    where: { id: "singleton" },
    update: { berichtReferenzberichteMaxAnzahl: Math.round(value) },
    create: { id: "singleton", berichtReferenzberichteMaxAnzahl: Math.round(value) },
  });
  await logAccess({ userId: admin.id, action: "UPDATE", entityType: "Settings", details: "berichtReferenzberichteMaxAnzahl geändert" });
  revalidatePath("/admin/abschlussbericht");
}
