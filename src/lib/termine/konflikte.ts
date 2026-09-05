// Terminbuchung: Konfliktprüfung (Raum-Doppelbelegung, Mitarbeiterin-Doppelbuchung) - reine Berechnung
// auf bereits geladenen Zeiträumen, DB-Abfrage bleibt in den Actions (Konvention wie
// src/lib/interim/ueberschneidung.ts, aus dem auch die Überlapp-Formel wiederverwendet wird).
import { prisma } from "@/lib/prisma";
import { berechneUeberlappungMinuten } from "@/lib/interim/ueberschneidung";

export type TerminKonflikt = {
  terminId: string;
  titel: string;
  mitarbeiterinName: string;
  startsAt: Date;
  endsAt: Date;
  ueberlappungMinuten: number;
};

async function findeKonflikte(where: { raumId?: string; employeeId?: string }, startsAt: Date, endsAt: Date, ausschlussTerminId?: string): Promise<TerminKonflikt[]> {
  const kandidaten = await prisma.termin.findMany({
    where: {
      ...where,
      status: "GEPLANT",
      id: ausschlussTerminId ? { not: ausschlussTerminId } : undefined,
      startsAt: { lt: endsAt },
      endsAt: { gt: startsAt },
    },
    include: { employee: true },
  });

  return kandidaten
    .map((t) => ({
      terminId: t.id,
      titel: t.titel,
      mitarbeiterinName: t.employee.name,
      startsAt: t.startsAt,
      endsAt: t.endsAt,
      ueberlappungMinuten: berechneUeberlappungMinuten(startsAt, endsAt, t.startsAt, t.endsAt),
    }))
    .filter((k) => k.ueberlappungMinuten > 0);
}

/** Doppelbelegung desselben Raums im selben Zeitfenster - Verwaltung kann bewusst übersteuern. */
export async function findeRaumKonflikt(raumId: string, startsAt: Date, endsAt: Date, ausschlussTerminId?: string): Promise<TerminKonflikt[]> {
  return findeKonflikte({ raumId }, startsAt, endsAt, ausschlussTerminId);
}

/** Doppelbuchung derselben Mitarbeiterin (z.B. bei freier Ad-hoc-Zeiteingabe außerhalb eines Slots). */
export async function findeMitarbeiterinKonflikt(employeeId: string, startsAt: Date, endsAt: Date, ausschlussTerminId?: string): Promise<TerminKonflikt[]> {
  return findeKonflikte({ employeeId }, startsAt, endsAt, ausschlussTerminId);
}
