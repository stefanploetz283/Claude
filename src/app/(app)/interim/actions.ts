"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireInterimAdmin } from "@/lib/rbac";
import { logAccess } from "@/lib/access-log";
import { berechneUeberlappungMinuten } from "@/lib/interim/ueberschneidung";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import type { InterimAngebotsart } from "@prisma/client";

export type Ueberschneidung = { andererFallName: string; andererZeitraumLabel: string; ueberlappungMinuten: number };
export type ActionState = { error?: string; conflicts?: Ueberschneidung[] } | undefined;

function combineDateTime(dateStr: string, timeStr: string) {
  return new Date(`${dateStr}T${timeStr}:00`);
}

/**
 * Fallübergreifende Zeitüberschneidungs-Prüfung (Interimsmodus): die Arbeitszeit einer Person existiert
 * nur einmal, daher wird über ALLE Fälle hinweg verglichen, nicht nur innerhalb desselben Falls - und
 * bewusst auch gegen andere Einträge DESSELBEN Falls (ein Doppel-Eintrag im selben Fall ist genauso
 * unmöglich). excludeEntryId schließt den gerade bearbeiteten Eintrag selbst aus dem Vergleich aus.
 */
async function findeUeberschneidungen(
  date: Date,
  startTime: Date,
  endTime: Date,
  excludeEntryId: string | null
): Promise<Ueberschneidung[]> {
  const kandidaten = await prisma.interimEntry.findMany({
    where: { date, ...(excludeEntryId ? { id: { not: excludeEntryId } } : {}) },
    include: { case: true },
  });

  const konflikte: Ueberschneidung[] = [];
  for (const k of kandidaten) {
    const minuten = berechneUeberlappungMinuten(startTime, endTime, k.startTime, k.endTime);
    if (minuten > 0) {
      konflikte.push({
        andererFallName: `${k.case.familienname}, ${k.case.vorname}`,
        andererZeitraumLabel: `${format(k.startTime, "HH:mm")}–${format(k.endTime, "HH:mm")} Uhr`,
        ueberlappungMinuten: minuten,
      });
    }
  }
  return konflikte;
}

export async function createInterimCase(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireInterimAdmin();

  const angebotsart = String(formData.get("angebotsart") ?? "") as InterimAngebotsart;
  const familienname = String(formData.get("familienname") ?? "").trim();
  const vorname = String(formData.get("vorname") ?? "").trim();
  const strasseHausnummer = String(formData.get("strasseHausnummer") ?? "").trim();
  const plzOrt = String(formData.get("plzOrt") ?? "").trim();
  const sachbearbeiterSpfd = String(formData.get("sachbearbeiterSpfd") ?? "").trim();
  const bewilligteWochenstundenStr = String(formData.get("bewilligteWochenstunden") ?? "").trim();
  const honorarProStundeStr = String(formData.get("honorarProStunde") ?? "").trim();
  const leistungserbringer = String(formData.get("leistungserbringer") ?? "").trim() || "Stefan Plötz";

  if (angebotsart !== "ERZIEHUNGSBEISTANDSCHAFT" && angebotsart !== "PROS") {
    return { error: "Bitte eine gültige Angebotsart wählen." };
  }
  if (!familienname || !vorname || !strasseHausnummer || !plzOrt || !sachbearbeiterSpfd) {
    return { error: "Bitte alle Felder ausfüllen." };
  }
  const bewilligteWochenstunden = Number(bewilligteWochenstundenStr.replace(",", "."));
  const honorarProStunde = Number(honorarProStundeStr.replace(",", "."));
  if (!Number.isFinite(bewilligteWochenstunden) || bewilligteWochenstunden <= 0) {
    return { error: "Bitte gültige bewilligte Wochenstunden angeben." };
  }
  if (!Number.isFinite(honorarProStunde) || honorarProStunde <= 0) {
    return { error: "Bitte ein gültiges Honorar pro Stunde angeben." };
  }

  const created = await prisma.interimCase.create({
    data: {
      angebotsart,
      familienname,
      vorname,
      strasseHausnummer,
      plzOrt,
      sachbearbeiterSpfd,
      bewilligteWochenstunden,
      honorarProStunde,
      leistungserbringer,
    },
  });

  await logAccess({ userId: user.id, action: "CREATE", entityType: "InterimCase", entityId: created.id });
  revalidatePath("/interim");
  redirect(`/interim/${created.id}`);
}

/** Nachträgliche Korrektur der Falldaten - gilt sofort für alle künftigen Exporte, bereits
 * heruntergeladene Excel-Dateien bleiben unberührt (die enthalten nur den damaligen Stand). */
export async function updateInterimCase(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireInterimAdmin();

  const id = String(formData.get("id") ?? "");
  const angebotsart = String(formData.get("angebotsart") ?? "") as InterimAngebotsart;
  const familienname = String(formData.get("familienname") ?? "").trim();
  const vorname = String(formData.get("vorname") ?? "").trim();
  const strasseHausnummer = String(formData.get("strasseHausnummer") ?? "").trim();
  const plzOrt = String(formData.get("plzOrt") ?? "").trim();
  const sachbearbeiterSpfd = String(formData.get("sachbearbeiterSpfd") ?? "").trim();
  const bewilligteWochenstundenStr = String(formData.get("bewilligteWochenstunden") ?? "").trim();
  const honorarProStundeStr = String(formData.get("honorarProStunde") ?? "").trim();
  const leistungserbringer = String(formData.get("leistungserbringer") ?? "").trim() || "Stefan Plötz";

  if (!id) return { error: "Fall nicht gefunden." };
  if (angebotsart !== "ERZIEHUNGSBEISTANDSCHAFT" && angebotsart !== "PROS") {
    return { error: "Bitte eine gültige Angebotsart wählen." };
  }
  if (!familienname || !vorname || !strasseHausnummer || !plzOrt || !sachbearbeiterSpfd) {
    return { error: "Bitte alle Felder ausfüllen." };
  }
  const bewilligteWochenstunden = Number(bewilligteWochenstundenStr.replace(",", "."));
  const honorarProStunde = Number(honorarProStundeStr.replace(",", "."));
  if (!Number.isFinite(bewilligteWochenstunden) || bewilligteWochenstunden <= 0) {
    return { error: "Bitte gültige bewilligte Wochenstunden angeben." };
  }
  if (!Number.isFinite(honorarProStunde) || honorarProStunde <= 0) {
    return { error: "Bitte ein gültiges Honorar pro Stunde angeben." };
  }

  await prisma.interimCase.update({
    where: { id },
    data: {
      angebotsart,
      familienname,
      vorname,
      strasseHausnummer,
      plzOrt,
      sachbearbeiterSpfd,
      bewilligteWochenstunden,
      honorarProStunde,
      leistungserbringer,
    },
  });

  await logAccess({ userId: user.id, action: "UPDATE", entityType: "InterimCase", entityId: id });
  revalidatePath("/interim");
  revalidatePath(`/interim/${id}`);
  return undefined;
}

export async function createInterimEntry(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireInterimAdmin();

  const caseId = String(formData.get("caseId") ?? "");
  const date = String(formData.get("date") ?? "");
  const startTimeStr = String(formData.get("startTime") ?? "");
  const endTimeStr = String(formData.get("endTime") ?? "");
  const content = String(formData.get("content") ?? "").trim();
  const bestaetigt = String(formData.get("bestaetigt") ?? "") === "true";

  if (!date || !startTimeStr || !endTimeStr || !content) {
    return { error: "Bitte alle Felder ausfüllen." };
  }

  const startTime = combineDateTime(date, startTimeStr);
  const endTime = combineDateTime(date, endTimeStr);
  if (endTime.getTime() <= startTime.getTime()) {
    return { error: "Die Endzeit muss nach der Startzeit liegen." };
  }

  const konflikte = await findeUeberschneidungen(new Date(date), startTime, endTime, null);
  if (konflikte.length > 0 && !bestaetigt) {
    return { conflicts: konflikte };
  }

  await prisma.interimEntry.create({
    data: { caseId, date: new Date(date), startTime, endTime, content, ueberschneidungBestaetigt: konflikte.length > 0 },
  });

  await logAccess({ userId: user.id, action: "CREATE", entityType: "InterimEntry", entityId: caseId });
  revalidatePath(`/interim/${caseId}`);
  revalidatePath("/interim"); // Stunden pro Fall + Gesamtsumme auf der Übersicht sollen sofort mit aktualisieren.
  return undefined;
}

/** Nachträgliche Korrektur eines per Diktat erzeugten Eintrags - das Diktat liefert nur einen ersten
 * Entwurf, der vor der Abrechnung von Hand korrigiert werden können muss. Löst die Korrektur die
 * Überschneidung auf, wird die Markierung automatisch entfernt (kein separater Schritt nötig). */
export async function updateInterimEntry(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireInterimAdmin();

  const id = String(formData.get("id") ?? "");
  const caseId = String(formData.get("caseId") ?? "");
  const date = String(formData.get("date") ?? "");
  const startTimeStr = String(formData.get("startTime") ?? "");
  const endTimeStr = String(formData.get("endTime") ?? "");
  const content = String(formData.get("content") ?? "").trim();
  const bestaetigt = String(formData.get("bestaetigt") ?? "") === "true";

  if (!date || !startTimeStr || !endTimeStr || !content) {
    return { error: "Bitte alle Felder ausfüllen." };
  }

  const startTime = combineDateTime(date, startTimeStr);
  const endTime = combineDateTime(date, endTimeStr);
  if (endTime.getTime() <= startTime.getTime()) {
    return { error: "Die Endzeit muss nach der Startzeit liegen." };
  }

  const konflikte = await findeUeberschneidungen(new Date(date), startTime, endTime, id);
  if (konflikte.length > 0 && !bestaetigt) {
    return { conflicts: konflikte };
  }

  await prisma.interimEntry.update({
    where: { id },
    data: { date: new Date(date), startTime, endTime, content, ueberschneidungBestaetigt: konflikte.length > 0 },
  });

  await logAccess({ userId: user.id, action: "UPDATE", entityType: "InterimEntry", entityId: id });
  revalidatePath(`/interim/${caseId}`);
  revalidatePath("/interim");
  return undefined;
}

/** Warnmarkierung ohne inhaltliche Änderung entfernen - für den Fall, dass die Überschneidung bereits
 * geprüft und bewusst als unproblematisch eingestuft wurde, ohne den Eintrag selbst zu ändern. */
export async function clearUeberschneidungMarkierung(id: string, caseId: string) {
  const user = await requireInterimAdmin();
  await prisma.interimEntry.update({ where: { id }, data: { ueberschneidungBestaetigt: false } });
  await logAccess({ userId: user.id, action: "UPDATE", entityType: "InterimEntry", entityId: id, details: "Überschneidungs-Markierung entfernt" });
  revalidatePath(`/interim/${caseId}`);
  revalidatePath("/interim");
}

export type UeberschneidungsKonflikt = {
  date: string;
  fallA: string;
  zeitraumA: string;
  fallB: string;
  zeitraumB: string;
  ueberlappungMinuten: number;
};

/** Vollständiger Scan (Prompt Punkt 2): durchsucht ALLE Einträge über ALLE Fälle hinweg, auch
 * rückwirkend erfasste, die vor Einführung dieser Prüfung angelegt wurden. */
export async function scanAlleUeberschneidungen(): Promise<UeberschneidungsKonflikt[]> {
  await requireInterimAdmin();

  const entries = await prisma.interimEntry.findMany({
    include: { case: true },
    orderBy: { date: "desc" },
  });

  const konflikte: UeberschneidungsKonflikt[] = [];
  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      const a = entries[i];
      const b = entries[j];
      if (a.date.getTime() !== b.date.getTime()) continue;
      const minuten = berechneUeberlappungMinuten(a.startTime, a.endTime, b.startTime, b.endTime);
      if (minuten > 0) {
        konflikte.push({
          date: format(a.date, "dd.MM.yyyy", { locale: de }),
          fallA: `${a.case.familienname}, ${a.case.vorname}`,
          zeitraumA: `${format(a.startTime, "HH:mm")}–${format(a.endTime, "HH:mm")}`,
          fallB: `${b.case.familienname}, ${b.case.vorname}`,
          zeitraumB: `${format(b.startTime, "HH:mm")}–${format(b.endTime, "HH:mm")}`,
          ueberlappungMinuten: minuten,
        });
      }
    }
  }
  // date-desc ist über die Sortierung der Ausgangsliste nicht garantiert (verschachtelte Paar-Bildung) -
  // hier explizit neueste zuerst, wie im Prompt gefordert.
  konflikte.sort((x, y) => (x.date < y.date ? 1 : x.date > y.date ? -1 : 0));
  return konflikte;
}

export type TagesEintrag = {
  id: string;
  fallId: string;
  fallName: string;
  startTime: string;
  endTime: string;
  content: string;
  ueberschneidung: boolean;
};

/** Tages-Vergleichsansicht (Prompt Punkt 3): alle Einträge eines Datums über alle Fälle hinweg,
 * überschneidende Einträge sind markiert. */
export async function getTagesUebersicht(dateStr: string): Promise<TagesEintrag[]> {
  await requireInterimAdmin();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return [];

  const entries = await prisma.interimEntry.findMany({
    where: { date: new Date(dateStr) },
    include: { case: true },
    orderBy: { startTime: "asc" },
  });

  const ueberschneidendeIds = new Set<string>();
  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      if (berechneUeberlappungMinuten(entries[i].startTime, entries[i].endTime, entries[j].startTime, entries[j].endTime) > 0) {
        ueberschneidendeIds.add(entries[i].id);
        ueberschneidendeIds.add(entries[j].id);
      }
    }
  }

  return entries.map((e) => ({
    id: e.id,
    fallId: e.caseId,
    fallName: `${e.case.familienname}, ${e.case.vorname}`,
    startTime: format(e.startTime, "HH:mm"),
    endTime: format(e.endTime, "HH:mm"),
    content: e.content,
    ueberschneidung: ueberschneidendeIds.has(e.id),
  }));
}

/** Vorprüfung vor dem Excel-Export (Prompt Punkt 4): existiert für Fall+Monat ein aktueller Konflikt -
 * unabhängig davon, ob bereits bestätigt, denn "bestätigt" heißt nur "bewusst zur Kenntnis genommen",
 * nicht "behoben". */
export async function pruefeMonatsUeberschneidungen(caseId: string, year: number, month: number): Promise<UeberschneidungsKonflikt[]> {
  await requireInterimAdmin();

  const monatsEintraege = await prisma.interimEntry.findMany({
    where: { caseId, date: { gte: new Date(Date.UTC(year, month - 1, 1)), lt: new Date(Date.UTC(year, month, 1)) } },
    include: { case: true },
  });

  const konflikte: UeberschneidungsKonflikt[] = [];
  for (const eintrag of monatsEintraege) {
    const gegenkandidaten = await findeUeberschneidungen(eintrag.date, eintrag.startTime, eintrag.endTime, eintrag.id);
    for (const g of gegenkandidaten) {
      konflikte.push({
        date: format(eintrag.date, "dd.MM.yyyy", { locale: de }),
        fallA: `${eintrag.case.familienname}, ${eintrag.case.vorname}`,
        zeitraumA: `${format(eintrag.startTime, "HH:mm")}–${format(eintrag.endTime, "HH:mm")}`,
        fallB: g.andererFallName,
        zeitraumB: g.andererZeitraumLabel,
        ueberlappungMinuten: g.ueberlappungMinuten,
      });
    }
  }
  return konflikte;
}

export async function deleteInterimEntry(id: string, caseId: string) {
  const user = await requireInterimAdmin();
  await prisma.interimEntry.delete({ where: { id } });
  await logAccess({ userId: user.id, action: "UPDATE", entityType: "InterimEntry", entityId: id, details: "Gelöscht" });
  revalidatePath(`/interim/${caseId}`);
  revalidatePath("/interim");
}
