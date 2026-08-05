import { format } from "date-fns";
import { de } from "date-fns/locale";

/** Formatiert ein Datum als YYYY-MM-DD nach Kalendertag am Serverstandort (nicht UTC), passend für <input type="date">. */
export function toDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Liefert {year, month} nur, wenn "from" und "to" im selben Kalendermonat liegen (für Leistungsnachweis-PDF). */
export function singleMonthOf(from: Date, to: Date): { year: number; month: number } | null {
  if (from.getUTCFullYear() !== to.getUTCFullYear() || from.getUTCMonth() !== to.getUTCMonth()) return null;
  return { year: from.getUTCFullYear(), month: from.getUTCMonth() + 1 };
}

/** "Juli 2026" wenn from/to im selben Monat liegen, sonst ein Datumsbereich "dd.MM.yyyy – dd.MM.yyyy". */
export function monthOrRangeLabel(from: Date, to: Date): string {
  const single = singleMonthOf(from, to);
  if (single) return format(new Date(Date.UTC(single.year, single.month - 1, 1)), "MMMM yyyy", { locale: de });
  return `${format(from, "dd.MM.yyyy")} – ${format(to, "dd.MM.yyyy")}`;
}

/** Erster und letzter Tag (23:59:59.999 UTC) eines Kalendermonats, z.B. für Abrechnungszeiträume. */
export function monthDateRange(year: number, month: number): { from: Date; to: Date } {
  const from = new Date(Date.UTC(year, month - 1, 1));
  const to = new Date(Date.UTC(year, month, 1) - 1);
  return { from, to };
}

/**
 * Wie monthDateRange, aber als "YYYY-MM-DD"-Strings (erster/letzter Tag) für <input type="date">
 * bzw. Query-Parameter - bewusst ohne Date-Objekt-Umweg über lokale Zeitzone, damit es exakt zu den
 * UTC-basierten Zeitraumsgrenzen von monthDateRange passt.
 */
export function monthDateInputRange(year: number, month: number): { fromStr: string; toStr: string } {
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const pad = (n: number) => String(n).padStart(2, "0");
  return { fromStr: `${year}-${pad(month)}-01`, toStr: `${year}-${pad(month)}-${pad(lastDay)}` };
}
