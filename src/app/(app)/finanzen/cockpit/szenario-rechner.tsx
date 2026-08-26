"use client";

import { useMemo, useState } from "react";

function eur(value: number): string {
  return value.toLocaleString("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
}

/** Entspricht computeSzenario() in src/lib/betriebscockpit.ts - hier bewusst dupliziert (nicht importiert),
 * da betriebscockpit.ts über umsatz.ts transitiv Prisma importiert und daher nicht clientseitig gebündelt
 * werden darf. */
function computeSzenario(
  angenommeneQuote: number,
  zielFlsStdJahr: number,
  zielQuote: number,
  stundensatzBasis: number,
  geplanteGesamtkostenJahr: number
): number | null {
  if (zielQuote <= 0) return null;
  const umsatz = angenommeneQuote * (zielFlsStdJahr / zielQuote) * stundensatzBasis;
  return umsatz - geplanteGesamtkostenJahr;
}

export function SzenarioRechner({
  zielFlsStdJahr,
  zielQuote,
  stundensatzBasis,
  geplanteGesamtkostenJahr,
}: {
  zielFlsStdJahr: number;
  zielQuote: number;
  stundensatzBasis: number;
  geplanteGesamtkostenJahr: number;
}) {
  const [angenommeneQuoteProzent, setAngenommeneQuoteProzent] = useState(Math.round(zielQuote * 100));

  const ergebnis = useMemo(
    () => computeSzenario(angenommeneQuoteProzent / 100, zielFlsStdJahr, zielQuote, stundensatzBasis, geplanteGesamtkostenJahr),
    [angenommeneQuoteProzent, zielFlsStdJahr, zielQuote, stundensatzBasis, geplanteGesamtkostenJahr]
  );

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-[var(--color-text-muted)]">Angenommene Quote</span>
        <span className="font-semibold text-[var(--color-text)]">{angenommeneQuoteProzent} %</span>
      </div>
      <input
        type="range"
        min={50}
        max={90}
        step={1}
        value={angenommeneQuoteProzent}
        onChange={(e) => setAngenommeneQuoteProzent(Number(e.target.value))}
        className="w-full accent-[var(--color-primary)]"
      />
      {ergebnis != null ? (
        <p className={`text-lg font-bold ${ergebnis < 0 ? "text-[var(--color-coral)]" : "text-[var(--color-primary)]"}`}>
          {ergebnis >= 0 ? "+" : ""}
          {eur(ergebnis)} {ergebnis < 0 ? "Verlust" : "Gewinn"}
        </p>
      ) : (
        <p className="text-sm text-[var(--color-text-muted)]">Bitte zuerst Ziel-Quote und Kalkulationswerte vervollständigen.</p>
      )}
    </div>
  );
}
