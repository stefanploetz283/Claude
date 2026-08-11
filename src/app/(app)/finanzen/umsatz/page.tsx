import Link from "next/link";
import { requireAdmin } from "@/lib/rbac";
import { computeUmsatzCockpit, computeLiquiditaetsAusblick, type PeriodType } from "@/lib/umsatz";
import { prisma } from "@/lib/prisma";
import { BeitragTable } from "./beitrag-table";

const MONTH_NAMES = [
  "Januar", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember",
];

const AMPEL_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  gruen: { bg: "var(--color-primary-soft)", text: "var(--color-primary)", label: "Im Ziel" },
  gelb: { bg: "#FBF1DC", text: "#8A5A12", label: "Leicht unter Ziel" },
  rot: { bg: "#FBE4E1", text: "#B23B2E", label: "Deutliche Zielverfehlung" },
};

function eur(value: number): string {
  return value.toLocaleString("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
}

export default async function UmsatzCockpitPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const now = new Date();

  const periodType = (params.type === "quarter" || params.type === "year" ? params.type : "month") as PeriodType;
  const year = Number(params.year) || now.getFullYear();
  const defaultIndex = periodType === "month" ? now.getMonth() + 1 : periodType === "quarter" ? Math.floor(now.getMonth() / 3) + 1 : 1;
  const periodIndex = Number(params.index) || defaultIndex;

  const [result, liquiditaet, settings] = await Promise.all([
    computeUmsatzCockpit(periodType, year, periodIndex, now),
    computeLiquiditaetsAusblick(3, now),
    prisma.settings.findUnique({ where: { id: "singleton" } }),
  ]);

  const zielFaktor = settings?.zielFaktor.toNumber() ?? 2.2;
  const mindestFaktor = settings?.mindestFaktorSteuerberater.toNumber() ?? 2.1;
  const ampelStyle = result.ampel ? AMPEL_STYLES[result.ampel] : null;

  const chartMax = Math.max(1, ...result.verlauf.map((p) => Math.max(p.kumuliert, p.ziel)));
  const chartW = 720;
  const chartH = 180;
  const points = result.verlauf.length > 1 ? result.verlauf : [];
  const xFor = (i: number) => (points.length > 1 ? (i / (points.length - 1)) * chartW : 0);
  const yFor = (v: number) => chartH - (v / chartMax) * chartH;
  const kumuliertPath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${xFor(i)} ${yFor(p.kumuliert)}`).join(" ");
  const zielPath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${xFor(i)} ${yFor(p.ziel)}`).join(" ");

  const faktorScaleMax = Math.max(zielFaktor, mindestFaktor, result.faktorAktuell ?? 0) * 1.25;
  const faktorPct = (v: number) => Math.min(100, Math.max(0, (v / faktorScaleMax) * 100));

  const typeTabs: { type: PeriodType; label: string }[] = [
    { type: "month", label: "Monat" },
    { type: "quarter", label: "Quartal" },
    { type: "year", label: "Jahr" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-primary)]">Umsatz-Cockpit</h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">Laufende Hochrechnung statt Monatsend-Überraschung.</p>
        </div>
        <div className="flex items-center gap-2">
          {typeTabs.map((t) => (
            <Link
              key={t.type}
              href={`/finanzen/umsatz?type=${t.type}&year=${year}&index=1`}
              className={`rounded-[var(--radius-control)] px-3.5 py-1.5 text-sm font-medium transition ${
                periodType === t.type
                  ? "bg-[var(--color-primary)] text-white"
                  : "border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-primary-soft)]"
              }`}
            >
              {t.label}
            </Link>
          ))}
        </div>
      </div>

      <form method="get" className="flex flex-wrap items-center gap-2 text-sm">
        <input type="hidden" name="type" value={periodType} />
        {periodType !== "year" && (
          <select name="index" defaultValue={periodIndex} className={selectCls}>
            {periodType === "month"
              ? MONTH_NAMES.map((m, i) => (
                  <option key={m} value={i + 1}>
                    {m}
                  </option>
                ))
              : [1, 2, 3, 4].map((q) => (
                  <option key={q} value={q}>
                    Q{q}
                  </option>
                ))}
          </select>
        )}
        <select name="year" defaultValue={year} className={selectCls}>
          {Array.from({ length: 5 }, (_, i) => now.getFullYear() - i).map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
        <button type="submit" className={btnCls}>
          Anzeigen
        </button>
      </form>

      {settings?.gesamtkostenJahr == null && (
        <div className="rounded-[var(--radius-control)] border border-[var(--color-gold)] bg-[#FBF1DC] px-4 py-3 text-sm text-[#8A5A12]">
          Gesamtkosten/Jahr sind noch nicht hinterlegt — Ziel-Abgleich, Ampel und Faktor können erst berechnet werden,
          sobald der Wert unter Admin → Einstellungen eingetragen ist.
        </div>
      )}

      {/* 1. Kopfkennzahl */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className={`${cardCls} lg:col-span-2`}>
          <h3 className="mb-1 text-sm font-semibold text-[var(--color-text)]">Hochrechnung ({periodLabel(periodType, year, periodIndex)})</h3>
          <div className="flex flex-wrap items-end gap-4">
            <p className="text-4xl font-bold text-[var(--color-text)]">{eur(result.hochrechnung)}</p>
            {ampelStyle && (
              <span
                className="rounded-full px-3.5 py-1.5 text-sm font-semibold"
                style={{ background: ampelStyle.bg, color: ampelStyle.text }}
              >
                {result.abweichungProzent! >= 0 ? "+" : ""}
                {result.abweichungProzent!.toFixed(1)} % · {ampelStyle.label}
              </span>
            )}
          </div>
          <p className="mt-2 text-sm text-[var(--color-text-muted)]">
            Bisher {eur(result.umsatzBisher)} an {result.arbeitstageBisher} von {result.arbeitstageGesamt} Arbeitstagen.
            {result.zielUmsatzAnteilig != null && <> Ziel für den Zeitraum: {eur(result.zielUmsatzAnteilig)}.</>}
          </p>
        </div>

        {/* 3. Faktor-Anzeige */}
        <div className={cardCls}>
          <h3 className="mb-1 text-sm font-semibold text-[var(--color-text)]">Faktor (Umsatz ÷ Personalkosten)</h3>
          <p className="text-3xl font-bold text-[var(--color-text)]">
            {result.faktorAktuell != null ? result.faktorAktuell.toFixed(2) : "–"}
          </p>
          {result.faktorAktuell != null && (
            <div className="mt-3">
              <div className="relative h-2 w-full rounded-full bg-[var(--color-primary-soft)]">
                <div
                  className="h-full rounded-full bg-[var(--color-primary)]"
                  style={{ width: `${faktorPct(result.faktorAktuell)}%` }}
                />
                <div
                  className="absolute top-1/2 h-3 w-0.5 -translate-y-1/2 bg-[var(--color-coral)]"
                  style={{ left: `${faktorPct(mindestFaktor)}%` }}
                  title={`Mindestfaktor ${mindestFaktor}`}
                />
                <div
                  className="absolute top-1/2 h-3 w-0.5 -translate-y-1/2 bg-[var(--color-gold)]"
                  style={{ left: `${faktorPct(zielFaktor)}%` }}
                  title={`Zielfaktor ${zielFaktor}`}
                />
              </div>
              <div className="mt-1.5 flex justify-between text-[11px] text-[var(--color-text-muted)]">
                <span>Mindest {mindestFaktor}</span>
                <span>Ziel {zielFaktor}</span>
              </div>
            </div>
          )}
          {result.faktorWarnung && (
            <p className="mt-3 rounded-[var(--radius-control)] bg-[#FBE4E1] px-3 py-2 text-xs font-semibold text-[#B23B2E]">
              Struktureller Warnhinweis: Faktor liegt unter dem Mindestwert des Steuerberaters ({mindestFaktor}).
            </p>
          )}
        </div>
      </div>

      {/* 2. Verlaufsgrafik */}
      <div className={cardCls}>
        <h3 className="mb-3 text-sm font-semibold text-[var(--color-text)]">Umsatzverlauf (kumuliert)</h3>
        {points.length > 1 ? (
          <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full">
            <path d={zielPath} fill="none" stroke="var(--color-gold)" strokeWidth="1.5" strokeDasharray="5 4" />
            <path d={kumuliertPath} fill="none" stroke="var(--color-primary)" strokeWidth="2" />
          </svg>
        ) : (
          <p className="text-sm text-[var(--color-text-muted)]">Noch nicht genug Daten im Zeitraum für einen Verlauf.</p>
        )}
        <div className="mt-2 flex gap-4 text-[11px] text-[var(--color-text-muted)]">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-4 bg-[var(--color-primary)]" /> Ist (kumuliert)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-4 bg-[var(--color-gold)]" style={{ borderTop: "1.5px dashed var(--color-gold)" }} /> Ziel
          </span>
        </div>
      </div>

      {/* 4. Beitrag pro Mitarbeiter */}
      <div>
        <h2 className="mb-3 text-lg font-semibold text-[var(--color-text)]">Beitrag pro Mitarbeiter</h2>
        <BeitragTable beitraege={result.beitraege} />
      </div>

      {/* 5. Liquiditäts-Ausblick */}
      <div className={cardCls}>
        <h3 className="mb-1 text-sm font-semibold text-[var(--color-text)]">Liquiditäts-Ausblick</h3>
        <p className="mb-3 text-xs text-[var(--color-text-muted)]">
          Erwarteter Geldeingang (Umsatz verschoben um {settings?.zahlungsverzugTageJugendamt ?? 45} Tage Zahlungsverzug) neben
          laufenden Ausgaben. Reine Anzeige auf Schätzbasis, kein Ersatz für Buchhaltung/Steuerberater.
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {liquiditaet.map((m) => {
            const diff = m.erwarteterGeldeingang - m.erwarteteAusgaben;
            const knapp = diff < 0;
            return (
              <div key={m.monatLabel} className="rounded-[var(--radius-control)] border border-[var(--color-border)] p-3.5">
                <p className="text-sm font-semibold text-[var(--color-text)]">{m.monatLabel}</p>
                <div className="mt-2 flex flex-col gap-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[var(--color-text-muted)]">Geldeingang</span>
                    <span className="text-[var(--color-text)]">{eur(m.erwarteterGeldeingang)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--color-text-muted)]">Ausgaben</span>
                    <span className="text-[var(--color-text)]">{eur(m.erwarteteAusgaben)}</span>
                  </div>
                </div>
                <p className={`mt-2 text-sm font-semibold ${knapp ? "text-[var(--color-coral)]" : "text-[var(--color-primary)]"}`}>
                  {diff >= 0 ? "+" : ""}
                  {eur(diff)}
                  {knapp && " · Lücke"}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function periodLabel(type: PeriodType, year: number, index: number): string {
  if (type === "month") return `${MONTH_NAMES[index - 1]} ${year}`;
  if (type === "quarter") return `Q${index} ${year}`;
  return `${year}`;
}

const cardCls = "rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-soft)]";
const selectCls = "rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1.5 text-sm text-[var(--color-text)]";
const btnCls =
  "rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-1.5 text-sm font-medium text-[var(--color-text)] transition hover:bg-[var(--color-primary-soft)]";
