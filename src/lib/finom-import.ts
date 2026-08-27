// Finom-CSV-Import: reine Parsing-/Kategorisierungslogik, DB-Orchestrierung ganz unten. Bewusst kein
// Live-Sync (API/Webhook) - monatlicher, admin-angestoßener Import, siehe Prompt.
import { prisma } from "@/lib/prisma";
import type { KostenKategorie, FinomZuordnungsquelle, FinomBuchungStatus } from "@prisma/client";

// ---------- CSV-Parsing (dependency-frei, deutsche Bank-Export-Konventionen) ----------

/** Erkennt Semikolon vs. Komma als Trennzeichen anhand der Kopfzeile - deutsche CSV-Exporte (Excel-
 * Gebietsschema) nutzen meist ";", da "," als Dezimaltrennzeichen reserviert ist. */
function detectDelimiter(headerLine: string): string {
  const semicolons = (headerLine.match(/;/g) ?? []).length;
  const commas = (headerLine.match(/,/g) ?? []).length;
  return semicolons >= commas ? ";" : ",";
}

function parseCsvLine(line: string, delimiter: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === delimiter) {
      fields.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields.map((f) => f.trim());
}

export type ParsedCsv = { headers: string[]; rows: string[][] };

/** Parst den vollständigen CSV-Text - entfernt eine eventuelle UTF-8-BOM, überspringt leere Zeilen. */
export function parseCsv(text: string): ParsedCsv {
  const clean = text.replace(/^﻿/, "");
  const lines = clean.split(/\r\n|\n|\r/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { headers: [], rows: [] };
  const delimiter = detectDelimiter(lines[0]);
  const headers = parseCsvLine(lines[0], delimiter);
  const rows = lines.slice(1).map((l) => parseCsvLine(l, delimiter));
  return { headers, rows };
}

/** Deutsche Zahlenformate ("1.234,56", "1234,56", "-45,00 €") - "," ist Dezimaltrennzeichen, sobald
 * vorhanden; "." davor gilt dann als Tausendertrennzeichen und wird entfernt. */
export function parseGermanNumber(raw: string): number | null {
  const trimmed = raw.trim().replace(/[€\s]/g, "");
  if (!trimmed) return null;
  let normalized = trimmed;
  if (normalized.includes(",")) {
    normalized = normalized.replace(/\./g, "").replace(",", ".");
  }
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

/** "DD.MM.YYYY" (deutsches Format) oder "YYYY-MM-DD" (ISO) - null bei unbekanntem Format. */
export function parseGermanDate(raw: string): Date | null {
  const trimmed = raw.trim();
  const de = trimmed.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (de) {
    const [, d, m, y] = de;
    return new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
  }
  const iso = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) {
    const [, y, m, d] = iso;
    return new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
  }
  return null;
}

// ---------- Spaltenzuordnung ----------

export type CsvSpaltenzuordnung = {
  datumSpalte: string;
  betragSpalte: string;
  empfaengerNameSpalte: string | null;
  empfaengerIbanSpalte: string | null;
  verwendungszweckSpalte: string | null;
  finomKategorieSpalte: string | null;
  belegSpalte: string | null;
};

export type FinomBuchungZeile = {
  datum: Date;
  betrag: number;
  empfaengerName: string | null;
  empfaengerIban: string | null;
  verwendungszweck: string | null;
  finomKategorie: string | null;
  hatBeleg: boolean | null;
};

/** Wendet die Spaltenzuordnung auf jede Rohzeile an - Zeilen mit unlesbarem Datum/Betrag werden
 * übersprungen (Rückgabe null), damit eine einzelne kaputte Zeile nicht den ganzen Import blockiert. */
export function mapCsvRow(headers: string[], row: string[], mapping: CsvSpaltenzuordnung): FinomBuchungZeile | null {
  const indexOf = (spalte: string | null) => (spalte ? headers.indexOf(spalte) : -1);
  const valueAt = (spalte: string | null): string | null => {
    const idx = indexOf(spalte);
    return idx >= 0 ? (row[idx] ?? "") : null;
  };

  const datumRaw = valueAt(mapping.datumSpalte);
  const betragRaw = valueAt(mapping.betragSpalte);
  if (!datumRaw || !betragRaw) return null;

  const datum = parseGermanDate(datumRaw);
  const betrag = parseGermanNumber(betragRaw);
  if (!datum || betrag == null) return null;

  const belegRaw = valueAt(mapping.belegSpalte);
  const hatBeleg = belegRaw == null ? null : /^(ja|yes|true|1|x)$/i.test(belegRaw.trim());

  return {
    datum,
    betrag,
    empfaengerName: valueAt(mapping.empfaengerNameSpalte) || null,
    empfaengerIban: valueAt(mapping.empfaengerIbanSpalte) || null,
    verwendungszweck: valueAt(mapping.verwendungszweckSpalte) || null,
    finomKategorie: valueAt(mapping.finomKategorieSpalte) || null,
    hatBeleg,
  };
}

/** Zusammengesetzter Duplikat-Schlüssel: Datum + Betrag + Empfänger/Verwendungszweck (Testfall 7b). */
export function buildDedupKey(zeile: Pick<FinomBuchungZeile, "datum" | "betrag" | "empfaengerName" | "verwendungszweck">): string {
  const bezug = (zeile.empfaengerName || zeile.verwendungszweck || "").trim().toLowerCase();
  return `${zeile.datum.toISOString().slice(0, 10)}|${zeile.betrag.toFixed(2)}|${bezug}`;
}

// ---------- Kategorisierungs-Regel (dreistufig + Fallback) ----------

export type KategorisierungsErgebnis = {
  kategorie: KostenKategorie | null;
  quelle: FinomZuordnungsquelle | null;
  status: FinomBuchungStatus;
};

/** Schritt 1 (IBAN/Empfänger) hat Vorrang vor Schritt 2 (Finom-Kategorie) vor Schritt 3 (Beleg-Fallback)
 * vor Schritt 4 (unkategorisiert, "Bitte zuordnen") - siehe Testfall 7. Ein Schritt-1-Treffer mit
 * kategorie=null bedeutet "ignorieren" (Gehalt/private Entnahme/Kontoumbuchung, siehe Prompt). */
export function applyKategorisierungsRegel(
  zeile: Pick<FinomBuchungZeile, "empfaengerName" | "empfaengerIban" | "finomKategorie" | "hatBeleg">,
  empfaengerZuordnungen: { empfaengerNameOderIban: string; kategorie: KostenKategorie | null }[],
  kategorieMappings: { finomKategorieBezeichnung: string; praxisKategorie: KostenKategorie }[]
): KategorisierungsErgebnis {
  const kandidaten = [zeile.empfaengerName, zeile.empfaengerIban].filter((v): v is string => !!v).map((v) => v.trim().toLowerCase());

  // Schritt 1
  const empfaengerTreffer = empfaengerZuordnungen.find((z) => kandidaten.includes(z.empfaengerNameOderIban.trim().toLowerCase()));
  if (empfaengerTreffer) {
    return empfaengerTreffer.kategorie
      ? { kategorie: empfaengerTreffer.kategorie, quelle: "IBAN", status: "ZUGEORDNET" }
      : { kategorie: null, quelle: "IBAN", status: "IGNORIERT" };
  }

  // Schritt 2
  if (zeile.finomKategorie) {
    const mappingTreffer = kategorieMappings.find((m) => m.finomKategorieBezeichnung.trim().toLowerCase() === zeile.finomKategorie!.trim().toLowerCase());
    if (mappingTreffer) return { kategorie: mappingTreffer.praxisKategorie, quelle: "FINOM_KATEGORIE", status: "ZUGEORDNET" };
  }

  // Schritt 3
  if (zeile.hatBeleg === true) {
    return { kategorie: "VERWALTUNGSSACHKOSTEN", quelle: "BELEG_FALLBACK", status: "ZUGEORDNET" };
  }

  // Schritt 4
  return { kategorie: null, quelle: null, status: "ZU_KLAEREN" };
}

// ---------- DB-Orchestrierung ----------

export async function getCsvSpaltenzuordnung(): Promise<CsvSpaltenzuordnung | null> {
  const row = await prisma.finomCsvSpaltenzuordnung.findUnique({ where: { id: "singleton" } });
  if (!row) return null;
  return {
    datumSpalte: row.datumSpalte,
    betragSpalte: row.betragSpalte,
    empfaengerNameSpalte: row.empfaengerNameSpalte,
    empfaengerIbanSpalte: row.empfaengerIbanSpalte,
    verwendungszweckSpalte: row.verwendungszweckSpalte,
    finomKategorieSpalte: row.finomKategorieSpalte,
    belegSpalte: row.belegSpalte,
  };
}

/** Best-Guess-Vorbelegung der Spaltenzuordnung anhand typischer Finom-/Bank-Export-Spaltennamen -
 * nur ein Startpunkt, der Admin bestätigt/korrigiert vor dem eigentlichen Import. */
export function guessSpaltenzuordnung(headers: string[]): Partial<CsvSpaltenzuordnung> {
  const find = (patterns: RegExp[]) => headers.find((h) => patterns.some((p) => p.test(h))) ?? null;
  return {
    datumSpalte: find([/datum/i, /date/i, /buchungstag/i]) ?? undefined,
    betragSpalte: find([/betrag/i, /amount/i]) ?? undefined,
    empfaengerNameSpalte: find([/empfänger/i, /empfaenger/i, /name/i, /gegenpartei/i, /counterparty/i]),
    empfaengerIbanSpalte: find([/iban/i]),
    verwendungszweckSpalte: find([/verwendungszweck/i, /zweck/i, /beschreibung/i, /description/i, /reference/i]),
    finomKategorieSpalte: find([/kategorie/i, /category/i]),
    belegSpalte: find([/beleg/i, /receipt/i, /invoice/i]),
  } as Partial<CsvSpaltenzuordnung>;
}

export type FinomImportZusammenfassung = {
  gesamtZeilen: number;
  neu: number;
  duplikate: number;
  automatischZugeordnet: number;
  ignoriert: number;
  zuKlaeren: number;
  uebersprungenUnlesbar: number;
};

/** Führt den vollständigen Import durch: parst, prüft Duplikate, kategorisiert, legt IstKostenEintrag für
 * erfolgreich zugeordnete Zeilen an. Speichert die verwendete Spaltenzuordnung als neue Vorbelegung. */
export async function importFinomCsv(csvText: string, mapping: CsvSpaltenzuordnung): Promise<FinomImportZusammenfassung> {
  const { headers, rows } = parseCsv(csvText);
  const importBatchId = `import_${Date.now()}`;

  const [empfaengerZuordnungen, kategorieMappings, existingRows] = await Promise.all([
    prisma.finomEmpfaengerZuordnung.findMany(),
    prisma.finomKategorieMapping.findMany(),
    prisma.finomBuchungRohdaten.findMany({ select: { datum: true, betrag: true, empfaengerName: true, verwendungszweck: true } }),
  ]);

  const existingKeys = new Set(
    existingRows.map((r) => buildDedupKey({ datum: r.datum, betrag: r.betrag.toNumber(), empfaengerName: r.empfaengerName, verwendungszweck: r.verwendungszweck }))
  );

  const summary: FinomImportZusammenfassung = {
    gesamtZeilen: rows.length,
    neu: 0,
    duplikate: 0,
    automatischZugeordnet: 0,
    ignoriert: 0,
    zuKlaeren: 0,
    uebersprungenUnlesbar: 0,
  };

  for (const row of rows) {
    const zeile = mapCsvRow(headers, row, mapping);
    if (!zeile) {
      summary.uebersprungenUnlesbar++;
      continue;
    }

    const key = buildDedupKey(zeile);
    if (existingKeys.has(key)) {
      summary.duplikate++;
      continue;
    }
    existingKeys.add(key);
    summary.neu++;

    const ergebnis = applyKategorisierungsRegel(zeile, empfaengerZuordnungen, kategorieMappings);

    let istKostenEintragId: string | null = null;
    if (ergebnis.status === "ZUGEORDNET" && ergebnis.kategorie) {
      const eintrag = await prisma.istKostenEintrag.create({
        data: {
          datum: zeile.datum,
          kategorie: ergebnis.kategorie,
          unterkategorie: zeile.empfaengerName,
          betrag: Math.abs(zeile.betrag),
          quelle: "finom_csv",
        },
      });
      istKostenEintragId = eintrag.id;
      summary.automatischZugeordnet++;
    } else if (ergebnis.status === "IGNORIERT") {
      summary.ignoriert++;
    } else {
      summary.zuKlaeren++;
    }

    await prisma.finomBuchungRohdaten.create({
      data: {
        datum: zeile.datum,
        betrag: zeile.betrag,
        empfaengerName: zeile.empfaengerName,
        empfaengerIban: zeile.empfaengerIban,
        verwendungszweck: zeile.verwendungszweck,
        finomKategorie: zeile.finomKategorie,
        hatBeleg: zeile.hatBeleg,
        zugeordneteKategorie: ergebnis.kategorie,
        zuordnungsquelle: ergebnis.quelle,
        status: ergebnis.status,
        istKostenEintragId,
        importBatchId,
      },
    });
  }

  await prisma.finomCsvSpaltenzuordnung.upsert({
    where: { id: "singleton" },
    update: mapping,
    create: { id: "singleton", ...mapping },
  });

  return summary;
}
