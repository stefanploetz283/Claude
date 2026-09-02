// Zeitüberschneidungs-Prüfung (Interimsmodus): reine Berechnung ohne Prisma-Import, damit sie sowohl
// serverseitig (Actions) als auch isoliert testbar bleibt - Konvention dieser Codebase.

/**
 * Überlappungsdauer in Minuten zwischen zwei Zeiträumen. 0, wenn kein echter Überlapp besteht - ein
 * direkt anschließender Termin (Ende A = Beginn B) zählt NICHT als Überschneidung (Start_A < Ende_B UND
 * Start_B < Ende_A ergibt in diesem Fall einen leeren/negativen Bereich).
 */
export function berechneUeberlappungMinuten(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): number {
  const start = Math.max(aStart.getTime(), bStart.getTime());
  const end = Math.min(aEnd.getTime(), bEnd.getTime());
  return Math.max(0, Math.round((end - start) / 60000));
}
