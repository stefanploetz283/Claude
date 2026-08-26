"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/rbac";
import { logAccess } from "@/lib/access-log";
import type { KostenKategorie } from "@prisma/client";

export type ActionState = { error?: string; success?: string } | undefined;

/**
 * Legt eine neue Kalkulationsversion an (Historie bleibt erhalten, siehe Prompt: "eine aktive Version,
 * Historie bei neuer Einreichung"). Kein Update der bestehenden Zeile - eine neue Version mit späterem
 * gueltigAb wird automatisch die aktive (siehe getActivePraxisKalkulation).
 */
export async function createPraxisKalkulationVersion(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();

  const gueltigAbStr = String(formData.get("gueltigAb") ?? "").trim();
  const geplantePersonalkostenJahrStr = String(formData.get("geplantePersonalkostenJahr") ?? "").trim();
  const geplanteRaumkostenJahrStr = String(formData.get("geplanteRaumkostenJahr") ?? "").trim();
  const geplanteVerwaltungssachkostenJahrStr = String(formData.get("geplanteVerwaltungssachkostenJahr") ?? "").trim();
  const geplanteSonstigeKostenAfaJahrStr = String(formData.get("geplanteSonstigeKostenAfaJahr") ?? "").trim();
  const zielQuoteStr = String(formData.get("zielQuote") ?? "").trim();
  const verfuegbarkeitsquoteStr = String(formData.get("verfuegbarkeitsquote") ?? "").trim();
  const zielFaktorStr = String(formData.get("zielFaktor") ?? "").trim();
  const mindestFaktorSteuerberaterStr = String(formData.get("mindestFaktorSteuerberater") ?? "").trim();
  const stundensatzBasisStr = String(formData.get("stundensatzBasis") ?? "").trim();
  const zielFlsStdJahrStr = String(formData.get("zielFlsStdJahr") ?? "").trim();
  const zahlungsverzugTageJugendamtStr = String(formData.get("zahlungsverzugTageJugendamt") ?? "").trim();
  const quelle = String(formData.get("quelle") ?? "").trim();

  if (!gueltigAbStr) return { error: "Bitte ein Gültig-ab-Datum angeben." };

  const numericFields: [string, string][] = [
    ["Geplante Personalkosten/Jahr", geplantePersonalkostenJahrStr],
    ["Geplante Raumkosten/Jahr", geplanteRaumkostenJahrStr],
    ["Geplante Verwaltungssachkosten/Jahr", geplanteVerwaltungssachkostenJahrStr],
    ["Geplante Sonstige Kosten/AfA/Jahr", geplanteSonstigeKostenAfaJahrStr],
    ["Ziel-Quote", zielQuoteStr],
    ["Verfügbarkeitsquote", verfuegbarkeitsquoteStr],
    ["Zielfaktor", zielFaktorStr],
    ["Mindestfaktor", mindestFaktorSteuerberaterStr],
    ["Stundensatz-Basis", stundensatzBasisStr],
    ["Ziel-FLS-Std./Jahr", zielFlsStdJahrStr],
    ["Zahlungsverzug (Tage)", zahlungsverzugTageJugendamtStr],
  ];
  const parsed: Record<string, number> = {};
  for (const [label, raw] of numericFields) {
    const value = Number(raw.replace(",", "."));
    if (!raw || !Number.isFinite(value) || value < 0) {
      return { error: `Bitte einen gültigen Wert für „${label}" angeben.` };
    }
    parsed[label] = value;
  }
  if (parsed["Ziel-Quote"] > 2 || parsed["Verfügbarkeitsquote"] > 2) {
    return { error: "Ziel-Quote und Verfügbarkeitsquote als Bruchzahl angeben (z.B. 0.75 für 75 %)." };
  }

  await prisma.praxisKalkulation.create({
    data: {
      gueltigAb: new Date(gueltigAbStr),
      geplantePersonalkostenJahr: parsed["Geplante Personalkosten/Jahr"],
      geplanteRaumkostenJahr: parsed["Geplante Raumkosten/Jahr"],
      geplanteVerwaltungssachkostenJahr: parsed["Geplante Verwaltungssachkosten/Jahr"],
      geplanteSonstigeKostenAfaJahr: parsed["Geplante Sonstige Kosten/AfA/Jahr"],
      zielQuote: parsed["Ziel-Quote"],
      verfuegbarkeitsquote: parsed["Verfügbarkeitsquote"],
      zielFaktor: parsed["Zielfaktor"],
      mindestFaktorSteuerberater: parsed["Mindestfaktor"],
      stundensatzBasis: parsed["Stundensatz-Basis"],
      zielFlsStdJahr: parsed["Ziel-FLS-Std./Jahr"],
      zahlungsverzugTageJugendamt: Math.round(parsed["Zahlungsverzug (Tage)"]),
      quelle: quelle || null,
    },
  });

  await logAccess({ userId: admin.id, action: "CREATE", entityType: "PraxisKalkulation", details: quelle || gueltigAbStr });
  revalidatePath("/finanzen/cockpit");
  return { success: "Neue Kalkulationsversion angelegt." };
}

export async function addIstKostenEintrag(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();

  const datumStr = String(formData.get("datum") ?? "").trim();
  const kategorie = String(formData.get("kategorie") ?? "") as KostenKategorie;
  const unterkategorie = String(formData.get("unterkategorie") ?? "").trim();
  const betragStr = String(formData.get("betrag") ?? "").trim();
  const belegReferenz = String(formData.get("belegReferenz") ?? "").trim();

  if (!datumStr) return { error: "Bitte ein Datum angeben." };
  if (!["PERSONALKOSTEN", "RAUMKOSTEN", "VERWALTUNGSSACHKOSTEN", "SONSTIGE_KOSTEN_AFA"].includes(kategorie)) {
    return { error: "Bitte eine gültige Kategorie wählen." };
  }
  const betrag = Number(betragStr.replace(",", "."));
  if (!Number.isFinite(betrag) || betrag <= 0) return { error: "Bitte einen gültigen Betrag angeben." };

  await prisma.istKostenEintrag.create({
    data: { datum: new Date(datumStr), kategorie, unterkategorie: unterkategorie || null, betrag, belegReferenz: belegReferenz || null },
  });

  await logAccess({ userId: admin.id, action: "CREATE", entityType: "IstKostenEintrag", details: `${kategorie} ${betrag}€` });
  revalidatePath("/finanzen/cockpit");
  return { success: "Kosten-Eintrag gespeichert." };
}

export async function addLiquiditaetsEintrag(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();

  const datumStr = String(formData.get("datum") ?? "").trim();
  const betragStr = String(formData.get("verfuegbareLiquideMittel") ?? "").trim();

  if (!datumStr) return { error: "Bitte ein Datum angeben." };
  const betrag = Number(betragStr.replace(",", "."));
  if (!Number.isFinite(betrag) || betrag < 0) return { error: "Bitte einen gültigen Betrag angeben." };

  await prisma.liquiditaetsEintrag.create({ data: { datum: new Date(datumStr), verfuegbareLiquideMittel: betrag } });

  await logAccess({ userId: admin.id, action: "CREATE", entityType: "LiquiditaetsEintrag", details: `${betrag}€` });
  revalidatePath("/finanzen/cockpit");
  return { success: "Liquiditäts-Eintrag gespeichert." };
}
