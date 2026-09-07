"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser, canAccessCase } from "@/lib/rbac";
import { logAccess } from "@/lib/access-log";
import { anthropic } from "@/lib/anthropic";
import { getSettings } from "@/lib/settings";
import {
  pruefeManualAbdeckung,
  pruefeLeistungsnachweisVerhaeltnis,
  ermittleFachkraefte,
  type ManualLueckenErgebnis,
  type LeistungsnachweisHinweis,
} from "@/lib/berichtsbausteine/vollstaendigkeitspruefung";
import { buildGenerierungsPrompt, type GenerierungsBaustein } from "@/lib/berichtsbausteine/generierung-prompt";
import { format } from "date-fns";
import { de } from "date-fns/locale";

async function assertCaseAccess(caseId: string) {
  const user = await requireUser();
  const caseRecord = await prisma.case.findUnique({ where: { id: caseId } });
  if (!caseRecord || !canAccessCase(user, caseRecord)) {
    throw new Error("Kein Zugriff auf diesen Fall.");
  }
  return user;
}

// ---------- Vollständigkeitsprüfung (Prompt Teil 3/3 Punkt 10 + 12) ----------

export type VollstaendigkeitspruefungResult =
  | {
      ok: true;
      manualLuecken: ManualLueckenErgebnis[];
      leistungsnachweisHinweise: LeistungsnachweisHinweis[];
      mehrereFachkraefte: boolean;
      fachkraefteNamen: string[];
      fallfuehrendeFachkraftName: string;
      manualVorhanden: boolean;
    }
  | { ok: false; error: string };

export async function runVollstaendigkeitspruefung(caseId: string): Promise<VollstaendigkeitspruefungResult> {
  await assertCaseAccess(caseId);

  const caseRecord = await prisma.case.findUnique({
    where: { id: caseId },
    include: { assignedEmployee: true, fallfuehrendeFachkraft: true },
  });
  if (!caseRecord) return { ok: false, error: "Fall nicht gefunden." };

  const [bausteine, serviceEntries, manualVersion, settings] = await Promise.all([
    prisma.berichtsbaustein.findMany({ where: { caseId }, include: { ersteller: true } }),
    prisma.serviceEntry.findMany({ where: { caseId }, select: { date: true } }),
    prisma.berichtsManualVersion.findFirst({ where: { helpTypeId: caseRecord.helpTypeId }, orderBy: { createdAt: "desc" } }),
    getSettings(),
  ]);

  const manualLuecken = pruefeManualAbdeckung(bausteine);

  const terminMonate = new Map<string, number>();
  for (const e of serviceEntries) {
    const key = `${e.date.getFullYear()}-${e.date.getMonth() + 1}`;
    terminMonate.set(key, (terminMonate.get(key) ?? 0) + 1);
  }
  const bausteinMonate = new Map<string, number>();
  for (const b of bausteine) {
    const key = `${b.erfassungszeitpunkt.getFullYear()}-${b.erfassungszeitpunkt.getMonth() + 1}`;
    bausteinMonate.set(key, (bausteinMonate.get(key) ?? 0) + 1);
  }
  const monate = [...terminMonate.entries()].map(([key, anzahlTermine]) => {
    const [jahr, monat] = key.split("-").map(Number);
    return { jahr, monat, anzahlTermine, anzahlBausteine: bausteinMonate.get(key) ?? 0 };
  });
  const leistungsnachweisHinweise = pruefeLeistungsnachweisVerhaeltnis(monate, settings.berichtLeistungsnachweisSchwellenwert);

  const { mehrereFachkraefte, namen } = ermittleFachkraefte(bausteine.map((b) => ({ erstellerId: b.erstellerId, erstellerName: b.ersteller.name })));

  return {
    ok: true,
    manualLuecken,
    leistungsnachweisHinweise,
    mehrereFachkraefte,
    fachkraefteNamen: namen,
    fallfuehrendeFachkraftName: caseRecord.fallfuehrendeFachkraft?.name ?? caseRecord.assignedEmployee.name,
    manualVorhanden: manualVersion !== null,
  };
}

// ---------- Berichtsgenerierung (Prompt Teil 3/3 Punkt 11) ----------

export type GenerierungResult = { ok: true } | { ok: false; error: string };

export async function generateAbschlussbericht(caseId: string): Promise<GenerierungResult> {
  const user = await assertCaseAccess(caseId);

  if (!process.env.ANTHROPIC_API_KEY) {
    return { ok: false, error: "Die Berichtsgenerierung ist nicht konfiguriert (fehlender API-Key). Bitte den Administrator informieren." };
  }

  const caseRecord = await prisma.case.findUnique({
    where: { id: caseId },
    include: { client: true, assignedEmployee: true, fallfuehrendeFachkraft: true },
  });
  if (!caseRecord) return { ok: false, error: "Fall nicht gefunden." };

  const manualVersion = await prisma.berichtsManualVersion.findFirst({
    where: { helpTypeId: caseRecord.helpTypeId },
    orderBy: { createdAt: "desc" },
  });
  if (!manualVersion) {
    return { ok: false, error: "Für diese Hilfeart ist noch kein Berichtsmanual hinterlegt. Bitte zuerst im Angebotskatalog eine erste Version speichern." };
  }

  const [bausteineRaw, konzeption, glossar, serviceEntries, settings] = await Promise.all([
    prisma.berichtsbaustein.findMany({
      where: { caseId },
      include: { ersteller: true, bezugBaustein: true },
      orderBy: { erfassungszeitpunkt: "asc" },
    }),
    prisma.praxisFachlicheKonzeption.upsert({ where: { id: "singleton" }, update: {}, create: { id: "singleton" } }),
    prisma.praxisGlossarBegriff.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.serviceEntry.findMany({ where: { caseId }, orderBy: [{ date: "asc" }, { startTime: "asc" }] }),
    getSettings(),
  ]);

  if (bausteineRaw.length === 0) {
    return { ok: false, error: "Es sind noch keine Berichtsbausteine erfasst." };
  }

  const referenzberichteRaw = await prisma.referenzbericht.findMany({
    where: { freigegeben: true },
    orderBy: { createdAt: "desc" },
    take: settings.berichtReferenzberichteMaxAnzahl,
  });

  const bausteine: GenerierungsBaustein[] = bausteineRaw.map((b) => ({
    erfassungszeitpunktLabel: format(b.erfassungszeitpunkt, "dd.MM.yyyy", { locale: de }),
    originaltext: b.originaltext,
    erstellerName: b.ersteller.name,
    vorlaeufigeKategorie: b.vorlaeufigeKategorie,
    triadeZuordnung: b.triadeZuordnung,
    bezugKurzbeschreibung: b.bezugBaustein
      ? `Baustein vom ${format(b.bezugBaustein.erfassungszeitpunkt, "dd.MM.yyyy", { locale: de })} ("${b.bezugBaustein.originaltext.slice(0, 60)}${b.bezugBaustein.originaltext.length > 60 ? "…" : ""}")`
      : null,
  }));

  // Nur Datum + kurzer Stichpunkt, keine ausformulierten Bemerkungstexte (Prompt Teil 3/3 Punkt 11.5).
  const terminListe = serviceEntries.map((e) => ({
    datumLabel: format(e.date, "dd.MM.yyyy", { locale: de }),
    stichpunkt: e.description.split(/\s+/).slice(0, 6).join(" ") + (e.description.split(/\s+/).length > 6 ? "…" : ""),
  }));

  const prompt = buildGenerierungsPrompt({
    manualText: manualVersion.text,
    bausteine,
    fachlicheKonzeption: konzeption.text,
    glossar: glossar.map((g) => ({ begriff: g.begriff, definition: g.definition })),
    terminListe,
    referenzberichte: referenzberichteRaw.map((r) => ({ titel: r.titel, text: r.text })),
    triade: caseRecord.triade,
    fallfuehrendeFachkraftName: caseRecord.fallfuehrendeFachkraft?.name ?? caseRecord.assignedEmployee.name,
    klientName: `${caseRecord.client.firstName} ${caseRecord.client.lastName}`,
  });

  let response;
  try {
    response = await anthropic.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 8000,
      system: prompt,
      messages: [{ role: "user", content: "Erstelle jetzt den vollständigen Abschlussbericht-Entwurf." }],
    });
  } catch (err) {
    console.error("Anthropic-Aufruf für Berichtsgenerierung fehlgeschlagen:", err);
    return { ok: false, error: "Die Berichtsgenerierung ist fehlgeschlagen. Bitte erneut versuchen." };
  }

  if (response.stop_reason === "refusal") {
    return { ok: false, error: "Der Bericht konnte nicht generiert werden." };
  }

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text" || !textBlock.text.trim()) {
    return { ok: false, error: "Aus der Generierung konnte kein Text erzeugt werden. Bitte erneut versuchen." };
  }

  // Erneute Generierung setzt den Freigabe-Status zurück - ein neu erzeugter Entwurf muss den
  // Freigabe-Workflow erneut durchlaufen, ein vorheriger Freigabe-/Korrekturstatus wäre nicht mehr gültig.
  await prisma.abschlussberichtEntwurf.upsert({
    where: { caseId },
    update: {
      text: textBlock.text,
      manualVersionId: manualVersion.id,
      status: "IN_BEARBEITUNG",
      generiertAm: new Date(),
      generiertVonId: user.id,
      submittedById: null,
      submittedAt: null,
      reviewedById: null,
      reviewedAt: null,
      correctionNote: null,
      lastEditedById: null,
      lastEditedAt: null,
    },
    create: {
      caseId,
      text: textBlock.text,
      manualVersionId: manualVersion.id,
      generiertAm: new Date(),
      generiertVonId: user.id,
    },
  });

  await logAccess({ userId: user.id, action: "CREATE", entityType: "AbschlussberichtEntwurf", entityId: caseId });
  revalidatePath(`/cases/${caseId}/berichtsbausteine`);
  return { ok: true };
}

// ---------- Entwurf bearbeiten & Freigabe-Workflow (Prompt Teil 3/3 Punkt 13) ----------

export type ActionState = { error?: string } | undefined;

export async function updateAbschlussberichtEntwurf(caseId: string, text: string): Promise<{ error?: string } | undefined> {
  const user = await assertCaseAccess(caseId);
  if (!text.trim()) return { error: "Der Bericht darf nicht leer sein." };

  const existing = await prisma.abschlussberichtEntwurf.findUnique({ where: { caseId } });
  if (!existing) return { error: "Es existiert noch kein Berichtsentwurf." };
  if (existing.status === "FREIGEGEBEN") return { error: "Ein freigegebener Bericht kann nicht mehr bearbeitet werden." };

  await prisma.abschlussberichtEntwurf.update({
    where: { caseId },
    data: { text, lastEditedById: user.id, lastEditedAt: new Date() },
  });
  await logAccess({ userId: user.id, action: "UPDATE", entityType: "AbschlussberichtEntwurf", entityId: caseId });
  revalidatePath(`/cases/${caseId}/berichtsbausteine`);
  return undefined;
}

export async function submitAbschlussberichtForApproval(caseId: string): Promise<{ error?: string } | undefined> {
  const user = await assertCaseAccess(caseId);

  const existing = await prisma.abschlussberichtEntwurf.findUnique({ where: { caseId } });
  if (!existing) return { error: "Es existiert noch kein Berichtsentwurf." };

  await prisma.abschlussberichtEntwurf.update({
    where: { caseId },
    data: { status: "WARTET_AUF_FREIGABE", submittedById: user.id, submittedAt: new Date(), correctionNote: null },
  });
  await logAccess({ userId: user.id, action: "UPDATE", entityType: "AbschlussberichtEntwurf", entityId: caseId, details: "Zur Freigabe eingereicht" });
  revalidatePath(`/cases/${caseId}/berichtsbausteine`);
  revalidatePath("/admin/approvals");
  return undefined;
}
