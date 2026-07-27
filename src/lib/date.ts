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
