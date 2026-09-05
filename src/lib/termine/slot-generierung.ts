// Terminbuchung: generiert aus aktiven TerminWochenvorlage-Zeilen die konkreten, buchbaren TerminSlot-
// Zeilen für ein rollierendes Fenster (Standard: 8 Wochen voraus). Idempotent über den
// @@unique([employeeId, startZeit])-Index (skipDuplicates) - beliebig oft aufrufbar, ohne Dubletten.
import { addDays } from "date-fns";
import { prisma } from "@/lib/prisma";

export const SLOT_VORLAUF_WOCHEN = 8;

function toUtcMidnight(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

/** ISO-Wochentag (1=Montag ... 7=Sonntag) - gleiche Konvention wie MitarbeiterPlan.wochenplan. */
function wochentagIso(date: Date): number {
  const d = date.getUTCDay();
  return d === 0 ? 7 : d;
}

function atMinutes(datum: Date, minutenSeitMitternacht: number): Date {
  return new Date(Date.UTC(datum.getUTCFullYear(), datum.getUTCMonth(), datum.getUTCDate(), 0, minutenSeitMitternacht));
}

function parseHhMm(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/**
 * Generiert fehlende Slots einer Mitarbeiterin bis `bisDatum` (inklusive). Tage, die vollständig in eine
 * Absence (URLAUB/KRANK) dieser Mitarbeiterin fallen, werden ausgelassen - für sie werden dort keine
 * Slots zur Buchung angeboten (Verzahnung mit dem Abwesenheitsmodul).
 */
export async function generiereSlotsFuerMitarbeiterin(employeeId: string, bisDatum: Date, heute: Date = new Date()): Promise<{ erstellt: number }> {
  const von = toUtcMidnight(heute);
  const bis = toUtcMidnight(bisDatum);
  if (bis.getTime() < von.getTime()) return { erstellt: 0 };

  const [vorlagen, abwesenheiten] = await Promise.all([
    prisma.terminWochenvorlage.findMany({ where: { employeeId, aktiv: true } }),
    prisma.absence.findMany({
      where: { employeeId, type: { in: ["URLAUB", "KRANK"] }, startDate: { lte: bis }, endDate: { gte: von } },
    }),
  ]);
  if (vorlagen.length === 0) return { erstellt: 0 };

  const abwesenheitsRanges = abwesenheiten.map((a) => ({ start: toUtcMidnight(a.startDate), end: toUtcMidnight(a.endDate) }));
  const istAbwesend = (datum: Date) => abwesenheitsRanges.some((r) => datum.getTime() >= r.start.getTime() && datum.getTime() <= r.end.getTime());

  const neueSlots: { employeeId: string; vorlageId: string; datum: Date; startZeit: Date; endZeit: Date }[] = [];

  for (let d = von; d.getTime() <= bis.getTime(); d = addDays(d, 1)) {
    if (istAbwesend(d)) continue;
    const wochentag = wochentagIso(d);
    for (const v of vorlagen) {
      if (v.wochentag !== wochentag) continue;
      const startMin = parseHhMm(v.startZeit);
      const endMin = parseHhMm(v.endZeit);
      for (let cursor = startMin; cursor + v.slotDauerMinuten <= endMin; cursor += v.slotDauerMinuten) {
        neueSlots.push({
          employeeId,
          vorlageId: v.id,
          datum: d,
          startZeit: atMinutes(d, cursor),
          endZeit: atMinutes(d, cursor + v.slotDauerMinuten),
        });
      }
    }
  }

  if (neueSlots.length === 0) return { erstellt: 0 };
  const result = await prisma.terminSlot.createMany({
    data: neueSlots.map((s) => ({ ...s, status: "FREI" as const })),
    skipDuplicates: true,
  });
  return { erstellt: result.count };
}

/** Für die Kalenderansicht: sorgt bedarfsgesteuert für Slot-Abdeckung mehrerer Mitarbeiterinnen. */
export async function sorgeFuerSlotAbdeckung(employeeIds: string[], wochenVoraus = SLOT_VORLAUF_WOCHEN, heute: Date = new Date()): Promise<void> {
  const bisDatum = addDays(heute, wochenVoraus * 7);
  await Promise.all(employeeIds.map((id) => generiereSlotsFuerMitarbeiterin(id, bisDatum, heute)));
}

/**
 * Nach einer inhaltlichen Änderung (Wochentag/Zeit/Dauer/Deaktivierung) einer Wochenvorlage: löscht NUR
 * die davon erzeugten, noch freien Zukunfts-Slots und baut sie (falls die Vorlage weiter aktiv ist) mit
 * den neuen Werten wieder auf. Gebuchte/ausgefallene Slots bleiben in jedem Fall unangetastet - so geht
 * laut Vorgabe nie eine bestehende Buchung durch eine Vorlagen-Änderung verloren.
 */
export async function regenerierFreieSlotsNachVorlagenAenderung(vorlageId: string, wochenVoraus = SLOT_VORLAUF_WOCHEN, heute: Date = new Date()): Promise<void> {
  const vorlage = await prisma.terminWochenvorlage.findUnique({ where: { id: vorlageId } });
  if (!vorlage) return;

  const von = toUtcMidnight(heute);
  await prisma.terminSlot.deleteMany({ where: { vorlageId, status: "FREI", datum: { gte: von } } });

  if (vorlage.aktiv) {
    await generiereSlotsFuerMitarbeiterin(vorlage.employeeId, addDays(von, wochenVoraus * 7), heute);
  }
}
