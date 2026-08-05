// Berechnungslogik für den Stundenmodell-Rechner (Jahresarbeitszeit/August-Vorarbeit).
// Alle Formeln sind allgemein für eine beliebige Wochenstundenzahl W formuliert - keine festen
// 30/35/39-Presets.

/**
 * Referenz-Tage-Divisor für die Fonds-Tage-Formel, hergeleitet aus den beiden Beispielwerten der
 * Vorgabe: (100-70.28)/100 * D = 6.2 und (100-80)/100 * D = 4.17 -> D = 250/12 (≈20.83), der übliche
 * "Jahresarbeitstage/12"-Referenzwert.
 */
const REFERENZ_TAGE_DIVISOR = 250 / 12;

const AUGUST_ARBEITSTAGE = 22;
const AUGUST_URLAUBSTAGE = 5;
const VERFUEGBARE_RESTTAGE = 216; // außerhalb Sondertagen/Betriebsferien

/** Std_pro_Tag(W, Tage_pro_Woche) */
export function stdProTag(wochenstunden: number, tageProWoche: number): number {
  return wochenstunden / tageProWoche;
}

/** Fonds_Tage - unabhängig von W. */
export function fondsTage(aktuelleFondsBasis: number): number {
  return ((100 - aktuelleFondsBasis) / 100) * REFERENZ_TAGE_DIVISOR;
}

/** Vorarbeit_Tage - unabhängig von W. */
export function vorarbeitTage(fondsTageValue: number): number {
  return AUGUST_ARBEITSTAGE - fondsTageValue - AUGUST_URLAUBSTAGE;
}

/** Vorarbeit_Std(W) - immer bezogen auf die reguläre 5-Tage-Woche als Referenz. */
export function vorarbeitStd(vorarbeitTageValue: number, wochenstunden: number): number {
  return vorarbeitTageValue * stdProTag(wochenstunden, 5);
}

export type SondertagInput = { dauerStd: number; istEchterExtraTag: boolean };

/** Überschuss_pro_Sondertag - kann negativ sein (verlängerter Normaltag mit geringer Dauer). */
export function ueberschussProSondertag(wochenstunden: number, tageProWoche: number, sondertag: SondertagInput): number {
  if (sondertag.istEchterExtraTag) return sondertag.dauerStd;
  return sondertag.dauerStd - stdProTag(wochenstunden, tageProWoche);
}

/** Anteilsfaktor bei unterjährigem Eintritt: verbleibende Monate im Jahr (inkl. Eintrittsmonat) / 12. */
export function anteilsfaktor(eintrittsdatum: Date, betrachtungsjahr: number): number {
  const eintrittsjahr = eintrittsdatum.getUTCFullYear();
  if (eintrittsjahr > betrachtungsjahr) return 0;
  if (eintrittsjahr < betrachtungsjahr) return 1;
  const monatEintritt = eintrittsdatum.getUTCMonth() + 1;
  return (13 - monatEintritt) / 12;
}

export type Warning = { level: "gelb" | "rot"; message: string };

export type SondertagWithMeta = SondertagInput & { id: string; name: string; datum: Date };

export type StundenmodellParams = {
  wochenstunden: number;
  tageProWoche: number;
  aktuelleFondsBasis: number;
  eintrittsdatum?: Date | null;
  betrachtungsjahr?: number;
  sondertage: SondertagWithMeta[];
};

export type StundenmodellResult = {
  stdProTag: number;
  fondsTageValue: number;
  vorarbeitTageValue: number;
  vorarbeitStdValue: number;
  summeUeberschuss: number;
  restStdValue: number;
  restMinProTagValue: number;
  anteilsfaktorValue: number | null;
  fondsTageAnteilig: number | null;
  warnings: Warning[];
  ampel: "gruen" | "gelb" | "rot";
};

const WOCHENTAGE = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];

export function computeStundenmodell(params: StundenmodellParams): StundenmodellResult {
  const { wochenstunden, tageProWoche, aktuelleFondsBasis, eintrittsdatum, betrachtungsjahr, sondertage } = params;

  const stdProTagValue = stdProTag(wochenstunden, tageProWoche);
  const fondsTageValue = fondsTage(aktuelleFondsBasis);
  const vorarbeitTageValue = vorarbeitTage(fondsTageValue);
  const vorarbeitStdValue = vorarbeitStd(vorarbeitTageValue, wochenstunden);

  const ueberschuesse = sondertage.map((s) => ({ sondertag: s, ueberschuss: ueberschussProSondertag(wochenstunden, tageProWoche, s) }));
  const summeUeberschuss = ueberschuesse.reduce((sum, u) => sum + u.ueberschuss, 0);
  const restStdValue = vorarbeitStdValue - summeUeberschuss;
  const restMinProTagValue = (restStdValue * 60) / VERFUEGBARE_RESTTAGE;

  let anteilsfaktorValue: number | null = null;
  let fondsTageAnteilig: number | null = null;
  if (eintrittsdatum && betrachtungsjahr) {
    anteilsfaktorValue = anteilsfaktor(eintrittsdatum, betrachtungsjahr);
    fondsTageAnteilig = fondsTageValue * anteilsfaktorValue;
  }

  const warnings: Warning[] = [];

  // Regel 1: 10-Stunden-Warnung
  if (stdProTagValue >= 10) {
    warnings.push({ level: "rot", message: `Regulärer Arbeitstag ${stdProTagValue.toFixed(2)} Std. – überschreitet die 10-Std.-Grenze (§ 3 ArbZG).` });
  } else if (stdProTagValue > 9) {
    warnings.push({ level: "gelb", message: `Regulärer Arbeitstag ${stdProTagValue.toFixed(2)} Std. – nähert sich der 10-Std.-Grenze (§ 3 ArbZG).` });
  }

  // Regel 2: negativer Sondertag-Überschuss
  for (const { sondertag, ueberschuss } of ueberschuesse) {
    if (ueberschuss < 0) {
      warnings.push({
        level: "gelb",
        message: `"${sondertag.name}" (${format(sondertag.datum)}) erzeugt für dieses Stundenmodell keinen Überschuss, sondern erhöht den Vorarbeit-Bedarf um ${Math.abs(ueberschuss).toFixed(2)} Std.`,
      });
    }
  }

  // Regel 3: Fonds-Widerspruch
  if (vorarbeitTageValue < 0) {
    warnings.push({
      level: "rot",
      message: `Die aktuelle Fonds-Basis verspricht ${fondsTageValue.toFixed(2)} freie Augusttage – das passt rechnerisch nicht zu den ${AUGUST_ARBEITSTAGE} Arbeitstagen im August (Differenz: ${Math.abs(vorarbeitTageValue).toFixed(2)} Tage).`,
    });
  }

  // Regel 4: 11-Std.-Ruhezeit bei echten Extra-Tagen am Samstag (Heuristik, da SondertagTyp keine
  // Uhrzeiten speichert - manuelle Prüfung wird empfohlen statt einer exakten Berechnung).
  for (const s of sondertage) {
    if (s.istEchterExtraTag && s.datum.getUTCDay() === 6) {
      warnings.push({
        level: "gelb",
        message: `"${s.name}" (${format(s.datum)}) fällt auf einen Samstag – bitte 11 Std. Ruhezeit bis zum nächsten regulären Arbeitstag manuell prüfen.`,
      });
    }
  }

  const ampel: StundenmodellResult["ampel"] = warnings.some((w) => w.level === "rot")
    ? "rot"
    : warnings.length > 0
      ? "gelb"
      : "gruen";

  return {
    stdProTag: stdProTagValue,
    fondsTageValue,
    vorarbeitTageValue,
    vorarbeitStdValue,
    summeUeberschuss,
    restStdValue,
    restMinProTagValue,
    anteilsfaktorValue,
    fondsTageAnteilig,
    warnings,
    ampel,
  };
}

function format(d: Date): string {
  return `${WOCHENTAGE[(d.getUTCDay() + 6) % 7]}, ${String(d.getUTCDate()).padStart(2, "0")}.${String(d.getUTCMonth() + 1).padStart(2, "0")}.${d.getUTCFullYear()}`;
}
