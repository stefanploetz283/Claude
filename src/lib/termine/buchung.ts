// Terminbuchung: gemeinsame Validierungs-/Speicherlogik für slot-basierte Buchung, freie Ad-hoc-
// Zeiteingabe, Serientermine und die Diktat-Buchung - ein einziger Ort für Pflichtfeld- und
// Konfliktregeln, damit alle Buchungswege (siehe buchung-actions.ts) dieselben Garantien einhalten.
import { prisma } from "@/lib/prisma";
import type { TerminKategorie, TerminArt } from "@prisma/client";
import { findeRaumKonflikt, findeMitarbeiterinKonflikt, type TerminKonflikt } from "./konflikte";

export type BuchungsEingabe = {
  kategorie: TerminKategorie;
  terminArt: TerminArt | null;
  titel: string;
  caseId: string | null;
  einzelmassnahmeBezeichnung: string | null;
  employeeId: string;
  bookedById: string;
  slotId: string | null;
  raumId: string | null;
  startsAt: Date;
  endsAt: Date;
  note: string | null;
  reminderMinutesBefore: number | null;
  serieId?: string | null;
};

export type BuchungsFehler = { error: string };
export type BuchungsKonflikt = { konflikte: TerminKonflikt[] };
export type BuchungsErgebnis = { terminId: string };

function istFehler(x: unknown): x is BuchungsFehler {
  return typeof x === "object" && x !== null && "error" in x;
}
function istKonflikt(x: unknown): x is BuchungsKonflikt {
  return typeof x === "object" && x !== null && "konflikte" in x;
}
export { istFehler as istBuchungsFehler, istKonflikt as istBuchungsKonflikt };

/** Pflichtfeld-Regeln je Terminkategorie (siehe Prompt Punkt 3). */
function pruefePflichtfelder(eingabe: BuchungsEingabe): string | null {
  if (!eingabe.titel.trim() && eingabe.kategorie !== "FALL_TERMIN") return "Bitte eine Kurzbezeichnung angeben.";
  if (eingabe.kategorie === "FALL_TERMIN") {
    if (!eingabe.caseId) return "Ein Fall-Termin muss mit einem Fall verknüpft sein.";
    if (!eingabe.terminArt) return "Bitte die Terminart auswählen.";
  }
  if (eingabe.kategorie === "EINZELMASSNAHME" && !eingabe.einzelmassnahmeBezeichnung?.trim()) {
    return "Bitte einen Namen/ein Aktenzeichen für die Einzelmaßnahme angeben.";
  }
  if (eingabe.endsAt.getTime() <= eingabe.startsAt.getTime()) return "Die Endzeit muss nach der Startzeit liegen.";
  return null;
}

/**
 * Validiert eine Buchung, prüft Raum-/Mitarbeiterin-Konflikte und speichert sie transaktional (inkl.
 * Slot-Statuswechsel auf GEBUCHT, falls über einen Slot gebucht wird). Ohne `override` wird bei
 * gefundenen Konflikten NICHT gespeichert, sondern die Konfliktliste zurückgegeben - der Aufrufer
 * entscheidet (siehe buchung-actions.ts), ob ein erneuter Aufruf mit `override:true` erlaubt ist
 * (nur Admin/Verwaltung, siehe Prompt Punkt 8).
 */
export async function validiereUndBuche(
  eingabe: BuchungsEingabe,
  opts: { override: boolean; ausschlussTerminId?: string }
): Promise<BuchungsFehler | BuchungsKonflikt | BuchungsErgebnis> {
  const pflichtfeldFehler = pruefePflichtfelder(eingabe);
  if (pflichtfeldFehler) return { error: pflichtfeldFehler };

  if (eingabe.slotId) {
    const slot = await prisma.terminSlot.findUnique({ where: { id: eingabe.slotId } });
    if (!slot || slot.status !== "FREI") return { error: "Dieser Slot ist nicht mehr verfügbar. Bitte einen anderen wählen." };
  }

  if (!opts.override) {
    const [raumKonflikte, mitarbeiterinKonflikte] = await Promise.all([
      eingabe.raumId ? findeRaumKonflikt(eingabe.raumId, eingabe.startsAt, eingabe.endsAt, opts.ausschlussTerminId) : Promise.resolve([]),
      findeMitarbeiterinKonflikt(eingabe.employeeId, eingabe.startsAt, eingabe.endsAt, opts.ausschlussTerminId),
    ]);
    const konflikte = [...raumKonflikte, ...mitarbeiterinKonflikte];
    if (konflikte.length > 0) return { konflikte };
  }

  const termin = await prisma.$transaction(async (tx) => {
    if (eingabe.slotId) {
      await tx.terminSlot.update({ where: { id: eingabe.slotId }, data: { status: "GEBUCHT" } });
    }
    return tx.termin.create({
      data: {
        kategorie: eingabe.kategorie,
        terminArt: eingabe.terminArt,
        titel: eingabe.titel.trim() || (eingabe.terminArt ?? "Termin"),
        caseId: eingabe.caseId,
        einzelmassnahmeBezeichnung: eingabe.einzelmassnahmeBezeichnung,
        employeeId: eingabe.employeeId,
        bookedById: eingabe.bookedById,
        slotId: eingabe.slotId,
        raumId: eingabe.raumId,
        startsAt: eingabe.startsAt,
        endsAt: eingabe.endsAt,
        note: eingabe.note,
        reminderMinutesBefore: eingabe.reminderMinutesBefore,
        serieId: eingabe.serieId ?? null,
      },
    });
  });

  return { terminId: termin.id };
}

/** Termin als ausgefallen markieren - Slot (falls vorhanden) wird wieder frei, Historie bleibt erhalten. */
export async function markiereAlsAusgefallen(terminId: string, ausfallNotiz: string | null): Promise<void> {
  const termin = await prisma.termin.findUnique({ where: { id: terminId } });
  if (!termin || termin.status === "AUSGEFALLEN") return;

  await prisma.$transaction(async (tx) => {
    await tx.termin.update({ where: { id: terminId }, data: { status: "AUSGEFALLEN", ausfallNotiz } });
    if (termin.slotId) await tx.terminSlot.update({ where: { id: termin.slotId }, data: { status: "FREI" } });
  });
}
