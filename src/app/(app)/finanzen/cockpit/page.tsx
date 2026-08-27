import Link from "next/link";
import { subMonths } from "date-fns";
import { requireAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { computeLiquiditaetsAusblick, type PeriodType } from "@/lib/umsatz";
import {
  computeCockpitKernzahlen,
  computeTeamQuoteTrendMonatlich,
  computeAbweichungKostenProzent,
  computeAbweichungUmsatzProzent,
  computeAuslastungsreserve,
  computeTrend,
  getLetzterFinomImport,
  countZuKlaerenBuchungen,
  ampelQuote,
  ampelKosten,
  ampelFaktor,
  ampelAuslastungsreserve,
  ampelLiquiditaet,
  type Trend,
} from "@/lib/betriebscockpit";
import { computeTeamUtilization, type CaseWithProfile } from "@/lib/capacity";
import type { AmpelStatus } from "@/lib/umsatz";
import { KalkulationForm, type KalkulationWerte } from "./kalkulation-form";
import { Erfassungsmaske } from "./erfassungsmaske";
import { SzenarioRechner } from "./szenario-rechner";
import { MitarbeiterTabelle, type MitarbeiterZeile } from "./mitarbeiter-tabelle";
import { CsvImport } from "./csv-import";
import { BitteZuordnenListe, type ZuKlaerenBuchung } from "./bitte-zuordnen-liste";
import { FinomZuordnungen } from "./finom-zuordnungen";

const MONTH_NAMES = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];

const AMPEL_STYLES: Record<AmpelStatus, { bg: string; text: string; label: string }> = {
  gruen: { bg: "var(--color-primary-soft)", text: "var(--color-primary)", label: "Im Ziel" },
  gelb: { bg: "#FBF1DC", text: "#8A5A12", label: "Warnung" },
  rot: { bg: "#FBE4E1", text: "#B23B2E", label: "Kritisch" },
};

const TREND_ICON: Record<Trend, string> = { hoch: "↑", stabil: "→", runter: "↓" };

function eur(value: number): string {
  return value.toLocaleString("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
}

function AmpelKachel({ label, wert, ampel, trend }: { label: string; wert: string; ampel: AmpelStatus | null; trend: Trend | null }) {
  const style = ampel ? AMPEL_STYLES[ampel] : null;
  return (
    <div className={cardCls}>
      <p className="mb-1 text-xs font-medium text-[var(--color-text-muted)]">{label}</p>
      <div className="flex items-center gap-2">
        <p className="text-2xl font-bold text-[var(--color-text)]">{wert}</p>
        {trend && <span className="text-lg text-[var(--color-text-muted)]" title={`Trend: ${trend}`}>{TREND_ICON[trend]}</span>}
      </div>
      {style && (
        <span className="mt-2 inline-block rounded-full px-2.5 py-1 text-xs font-semibold" style={{ background: style.bg, color: style.text }}>
          {style.label}
        </span>
      )}
    </div>
  );
}

export default async function BetriebscockpitPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireAdmin();
  const params = await searchParams;
  const now = new Date();

  const periodType = (params.type === "quarter" || params.type === "year" ? params.type : "month") as PeriodType;
  const year = Number(params.year) || now.getFullYear();
  const defaultIndex = periodType === "month" ? now.getMonth() + 1 : periodType === "quarter" ? Math.floor(now.getMonth() / 3) + 1 : 1;
  const periodIndex = Number(params.index) || defaultIndex;
  const trendReferenzDatum = subMonths(now, 3);

  const [k, kTrend, liquiditaetAusblick, quoteTrendMonatlich, settings, employees, zuKlaerenRows, empfaengerZuordnungen, kategorieMappings, letzterFinomImport, zuKlaerenCount] =
    await Promise.all([
      computeCockpitKernzahlen(periodType, year, periodIndex, now),
      computeCockpitKernzahlen(periodType, year, periodIndex, trendReferenzDatum),
      computeLiquiditaetsAusblick(3, now),
      computeTeamQuoteTrendMonatlich(12, now),
      getSettings(),
      prisma.user.findMany({ where: { role: "EMPLOYEE", active: true } }),
      prisma.finomBuchungRohdaten.findMany({ where: { status: "ZU_KLAEREN" }, orderBy: { datum: "desc" } }),
      prisma.finomEmpfaengerZuordnung.findMany({ orderBy: { erstelltAm: "desc" } }),
      prisma.finomKategorieMapping.findMany({ orderBy: { erstelltAm: "desc" } }),
      getLetzterFinomImport(),
      countZuKlaerenBuchungen(),
    ]);
  const { kalkulation, umsatz: umsatzResult, kostenSollIst, teamQuote: teamQuoteResult, letzteLiquiditaet } = k;
  const geplanteTotals = k.geplanteGesamtkostenJahr != null ? { geplanteGesamtkostenJahr: k.geplanteGesamtkostenJahr, geplanteBetriebskostenJahr: k.geplanteBetriebskostenJahr! } : null;
  const hochrechnungUmsatzJahr = umsatzResult.hochrechnungJahr;
  const hochrechnungGesamtkostenJahr = kostenSollIst?.hochrechnungGesamtkostenJahr ?? null;
  const zielQuote = kalkulation?.zielQuote.toNumber() ?? null;
  const hochrechnungGewinnJahr = k.hochrechnungGewinnJahr;
  const faktorHochgerechnet = k.faktorHochgerechnet;
  const teamIstQuote = teamQuoteResult.teamIstQuote;
  const abweichungQuotePunkte = k.abweichungQuotePunkte;
  const abweichungKostenProzent = k.abweichungKostenProzent;
  const abweichungUmsatzProzent = k.abweichungUmsatzProzent;
  const breakEvenQuote = k.breakEvenQuote;
  const auslastungsreservePunkte = k.auslastungsreservePunkte;
  const liquiditaetsReichweiteMonate = k.liquiditaetsReichweiteMonate;

  // Auslastungsvorschau-Kachel: Verweis auf die bestehende Kapazitätsansicht, keine eigene Logik.
  const employeeCases = await Promise.all(
    employees.map((e) =>
      prisma.case.findMany({
        where: { assignedEmployeeId: e.id, archived: false, status: { not: "COMPLETED" } },
        include: { client: true, helpType: { include: { activityProfiles: true } } },
      })
    )
  );
  const casesByEmployeeId = new Map(employees.map((e, i) => [e.id, employeeCases[i] as CaseWithProfile[]]));
  const teamUtilization = computeTeamUtilization(employees, casesByEmployeeId, settings.billableCapacityFactor.toNumber(), 8, now);

  // Trends: Vergleich aktueller Stand vs. Stand vor 3 Monaten (vereinfachte Näherung des "Durchschnitts
  // der letzten 3 Monate" aus dem Prompt - siehe Zusammenfassung).
  const trendQuote = teamIstQuote != null && kTrend.teamQuote.teamIstQuote != null ? computeTrend(teamIstQuote * 100, kTrend.teamQuote.teamIstQuote * 100) : null;
  const trendKosten =
    abweichungKostenProzent != null && geplanteTotals && kTrend.kostenSollIst
      ? computeTrend(abweichungKostenProzent, computeAbweichungKostenProzent(kTrend.kostenSollIst.hochrechnungGesamtkostenJahr, geplanteTotals.geplanteGesamtkostenJahr))
      : null;
  const trendUmsatz =
    abweichungUmsatzProzent != null && kalkulation && geplanteTotals
      ? computeTrend(abweichungUmsatzProzent, computeAbweichungUmsatzProzent(kTrend.umsatz.hochrechnungJahr, geplanteTotals.geplanteGesamtkostenJahr, kalkulation.zielFaktor.toNumber()))
      : null;
  const trendAuslastungsreserve =
    auslastungsreservePunkte != null && breakEvenQuote != null && kTrend.teamQuote.teamIstQuote != null
      ? computeTrend(auslastungsreservePunkte, computeAuslastungsreserve(kTrend.teamQuote.teamIstQuote, breakEvenQuote))
      : null;

  // Warnregel 6: Erfassungslücke (weder manuelle Ist-Kosten noch Liquiditäts-Eintrag noch CSV-Import seit >6 Wochen)
  const sechsWochenVorher = new Date(now.getTime() - 42 * 24 * 60 * 60 * 1000);
  const erfassungsluecke =
    (kostenSollIst?.letzterEintragAm == null || kostenSollIst.letzterEintragAm < sechsWochenVorher) &&
    (letzteLiquiditaet == null || letzteLiquiditaet.datum < sechsWochenVorher) &&
    (letzterFinomImport == null || letzterFinomImport < sechsWochenVorher);

  // Warnregel 7: "Bitte zuordnen"-Stau
  const bitteZuordnenStau = zuKlaerenCount > 15;

  const zuKlaerenBuchungen: ZuKlaerenBuchung[] = zuKlaerenRows.map((b) => ({
    id: b.id,
    datum: b.datum.toISOString(),
    betrag: b.betrag.toNumber(),
    empfaengerName: b.empfaengerName,
    verwendungszweck: b.verwendungszweck,
  }));

  const mitarbeiterZeilen: MitarbeiterZeile[] = umsatzResult.beitraege.map((b) => {
    const quote = teamQuoteResult.proMitarbeiter.find((m) => m.employeeId === b.employeeId);
    return { ...b, istQuoteProzent: quote?.istQuote != null ? quote.istQuote * 100 : null };
  });

  const kalkulationWerte: KalkulationWerte = kalkulation
    ? {
        gueltigAb: kalkulation.gueltigAb.toISOString().slice(0, 10),
        geplantePersonalkostenJahr: kalkulation.geplantePersonalkostenJahr.toString(),
        geplanteRaumkostenJahr: kalkulation.geplanteRaumkostenJahr.toString(),
        geplanteVerwaltungssachkostenJahr: kalkulation.geplanteVerwaltungssachkostenJahr.toString(),
        geplanteSonstigeKostenAfaJahr: kalkulation.geplanteSonstigeKostenAfaJahr.toString(),
        zielQuote: kalkulation.zielQuote.toString(),
        verfuegbarkeitsquote: kalkulation.verfuegbarkeitsquote.toString(),
        zielFaktor: kalkulation.zielFaktor.toString(),
        mindestFaktorSteuerberater: kalkulation.mindestFaktorSteuerberater.toString(),
        stundensatzBasis: kalkulation.stundensatzBasis.toString(),
        zielFlsStdJahr: kalkulation.zielFlsStdJahr.toString(),
        zahlungsverzugTageJugendamt: kalkulation.zahlungsverzugTageJugendamt.toString(),
        quelle: kalkulation.quelle ?? "",
      }
    : null;

  const typeTabs: { type: PeriodType; label: string }[] = [
    { type: "month", label: "Monat" },
    { type: "quarter", label: "Quartal" },
    { type: "year", label: "Jahr" },
  ];

  // Quote-Verlauf-Chart (Modul 2)
  const chartW = 720;
  const chartH = 160;
  const quotePoints = quoteTrendMonatlich.filter((p) => !p.istBetriebsferienMonat && p.teamIstQuote != null);
  const chartMax = Math.max((zielQuote ?? 0.75) * 1.2, ...quotePoints.map((p) => p.teamIstQuote ?? 0)) || 1;
  const xForIndex = (i: number) => (quoteTrendMonatlich.length > 1 ? (i / (quoteTrendMonatlich.length - 1)) * chartW : 0);
  const yFor = (v: number) => chartH - (v / chartMax) * chartH;
  const quotePath = quotePoints
    .map((p) => {
      const i = quoteTrendMonatlich.indexOf(p);
      return `${quotePoints.indexOf(p) === 0 ? "M" : "L"} ${xForIndex(i)} ${yFor(p.teamIstQuote!)}`;
    })
    .join(" ");
  const zielY = zielQuote != null ? yFor(zielQuote) : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-primary)]">Betriebswirtschaftliches Cockpit</h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">Quote, Kosten, Umsatz und Auslastungsrisiko auf einen Blick.</p>
        </div>
        <div className="flex items-center gap-2">
          {typeTabs.map((t) => (
            <Link
              key={t.type}
              href={`/finanzen/cockpit?type=${t.type}&year=${year}&index=1`}
              className={`rounded-[var(--radius-control)] px-3.5 py-1.5 text-sm font-medium transition ${
                periodType === t.type ? "bg-[var(--color-primary)] text-white" : "border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-primary-soft)]"
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

      {!kalkulation && (
        <div className="rounded-[var(--radius-control)] border border-[var(--color-gold)] bg-[#FBF1DC] px-4 py-3 text-sm text-[#8A5A12]">
          Noch keine Kalkulationsversion hinterlegt — bitte unten die Referenzwerte aus der Entgeltkalkulation eintragen, damit Ampeln,
          Break-Even und Szenario-Rechner berechnet werden können.
        </div>
      )}
      {erfassungsluecke && kalkulation && (
        <div className="rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3 text-sm text-[var(--color-text-muted)]">
          Seit mehr als 6 Wochen wurden weder Ist-Kosten noch ein Liquiditäts-Eintrag noch ein CSV-Import nachgetragen.
        </div>
      )}
      {bitteZuordnenStau && (
        <div className="rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3 text-sm text-[var(--color-text-muted)]">
          {zuKlaerenCount} unkategorisierte Finom-Buchungen warten auf der „Bitte zuordnen&quot;-Liste.
        </div>
      )}

      {/* 1. Ampel-Kopfzeile mit Trendpfeilen */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <AmpelKachel
          label={`Ist-Quote (${periodLabel(periodType, year, periodIndex)})`}
          wert={teamIstQuote != null ? `${(teamIstQuote * 100).toFixed(1)} %` : "–"}
          ampel={abweichungQuotePunkte != null ? ampelQuote(abweichungQuotePunkte) : null}
          trend={trendQuote}
        />
        <AmpelKachel
          label="Kosten hochgerechnet/Jahr"
          wert={hochrechnungGesamtkostenJahr != null ? eur(hochrechnungGesamtkostenJahr) : "–"}
          ampel={abweichungKostenProzent != null ? ampelKosten(abweichungKostenProzent) : null}
          trend={trendKosten}
        />
        <AmpelKachel
          label="Umsatz hochgerechnet/Jahr"
          wert={eur(hochrechnungUmsatzJahr)}
          ampel={abweichungUmsatzProzent != null ? (abweichungUmsatzProzent >= 0 ? "gruen" : abweichungUmsatzProzent >= -10 ? "gelb" : "rot") : null}
          trend={trendUmsatz}
        />
        <AmpelKachel
          label="Auslastungsreserve"
          wert={auslastungsreservePunkte != null ? `${auslastungsreservePunkte >= 0 ? "+" : ""}${auslastungsreservePunkte.toFixed(1)} Pkt.` : "–"}
          ampel={ampelAuslastungsreserve(auslastungsreservePunkte)}
          trend={trendAuslastungsreserve}
        />
      </div>
      {faktorHochgerechnet != null && kalkulation && ampelFaktor(faktorHochgerechnet, kalkulation.mindestFaktorSteuerberater.toNumber()) === "rot" && (
        <div className="rounded-[var(--radius-control)] bg-[#FBE4E1] px-4 py-3 text-sm font-semibold text-[#B23B2E]">
          Faktor-Warnung: Faktor_hochgerechnet {faktorHochgerechnet.toFixed(2)} liegt unter dem Mindestwert {kalkulation.mindestFaktorSteuerberater.toString()} — unabhängig vom Status der anderen Ampeln.
        </div>
      )}

      {/* 2. Quote-Verlauf */}
      <div className={cardCls}>
        <h3 className="mb-3 text-sm font-semibold text-[var(--color-text)]">Quote-Verlauf (Team, letzte 12 Monate)</h3>
        {quotePoints.length > 1 ? (
          <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full">
            {quoteTrendMonatlich.map((p, i) =>
              p.istBetriebsferienMonat ? (
                <rect
                  key={`${p.jahr}-${p.monat}`}
                  x={xForIndex(i) - chartW / quoteTrendMonatlich.length / 2}
                  y={0}
                  width={chartW / quoteTrendMonatlich.length}
                  height={chartH}
                  fill="var(--color-border)"
                  opacity={0.4}
                />
              ) : null
            )}
            {zielY != null && <line x1={0} y1={zielY} x2={chartW} y2={zielY} stroke="var(--color-gold)" strokeWidth={1.5} strokeDasharray="5 4" />}
            <path d={quotePath} fill="none" stroke="var(--color-primary)" strokeWidth={2} />
          </svg>
        ) : (
          <p className="text-sm text-[var(--color-text-muted)]">Noch nicht genug Daten für einen Verlauf.</p>
        )}
        <div className="mt-2 flex gap-4 text-[11px] text-[var(--color-text-muted)]">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-4 bg-[var(--color-primary)]" /> Ist-Quote
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-4" style={{ borderTop: "1.5px dashed var(--color-gold)" }} /> Ziel
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-4 bg-[var(--color-border)] opacity-40" /> Betriebsferien
          </span>
        </div>
      </div>

      {/* 3. Kosten-Soll-Ist-Tabelle */}
      {kostenSollIst && (
        <div className={cardCls}>
          <h3 className="mb-3 text-sm font-semibold text-[var(--color-text)]">Kosten-Soll-Ist ({year}, größte Abweichung zuerst)</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs font-semibold text-[var(--color-text-muted)] uppercase">
                <tr>
                  <th className="py-2 pr-3">Kategorie</th>
                  <th className="py-2 pr-3 text-right">Geplant/Jahr</th>
                  <th className="py-2 pr-3 text-right">Hochrechnung/Jahr</th>
                  <th className="py-2 pr-3 text-right">Abweichung</th>
                  <th className="py-2 pr-3 text-right">Zuordnungsquelle</th>
                </tr>
              </thead>
              <tbody>
                {kostenSollIst.zeilen.map((z) => (
                  <tr key={z.kategorie} className="border-t border-[var(--color-border)]">
                    <td className="py-2 pr-3 text-[var(--color-text)]">{z.label}</td>
                    <td className="py-2 pr-3 text-right text-[var(--color-text-muted)]">{eur(z.geplantJahr)}</td>
                    <td className="py-2 pr-3 text-right text-[var(--color-text)]">{eur(z.hochrechnungJahr)}</td>
                    <td className={`py-2 pr-3 text-right font-semibold ${z.abweichungEuro > 0 ? "text-[var(--color-coral)]" : "text-[var(--color-primary)]"}`}>
                      {z.abweichungEuro >= 0 ? "+" : ""}
                      {eur(z.abweichungEuro)} ({z.abweichungProzent >= 0 ? "+" : ""}
                      {z.abweichungProzent.toFixed(1)} %)
                    </td>
                    <td className="py-2 pr-3 text-right text-xs text-[var(--color-text-muted)]">
                      {z.anzahlFinomCsv} automatisch · {z.anzahlManuell} manuell
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CSV-Import-Baustein + "Bitte zuordnen"-Liste + Zuordnungsregeln (Phase 2) */}
      <CsvImport />
      <BitteZuordnenListe buchungen={zuKlaerenBuchungen} />
      <FinomZuordnungen empfaengerZuordnungen={empfaengerZuordnungen} kategorieMappings={kategorieMappings} />

      {/* 5. Umsatz- und Gewinn-Kachel */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className={cardCls}>
          <p className="mb-1 text-xs font-medium text-[var(--color-text-muted)]">Hochrechnung Umsatz/Jahr</p>
          <p className="text-2xl font-bold text-[var(--color-text)]">{eur(hochrechnungUmsatzJahr)}</p>
        </div>
        <div className={cardCls}>
          <p className="mb-1 text-xs font-medium text-[var(--color-text-muted)]">Hochrechnung Gewinn/Jahr</p>
          <p className={`text-2xl font-bold ${hochrechnungGewinnJahr != null && hochrechnungGewinnJahr < 0 ? "text-[var(--color-coral)]" : "text-[var(--color-text)]"}`}>
            {hochrechnungGewinnJahr != null ? eur(hochrechnungGewinnJahr) : "–"}
          </p>
        </div>
        <div className={cardCls}>
          <p className="mb-1 text-xs font-medium text-[var(--color-text-muted)]">Faktor hochgerechnet</p>
          <p className="text-2xl font-bold text-[var(--color-text)]">{faktorHochgerechnet != null ? faktorHochgerechnet.toFixed(2) : "–"}</p>
          {kalkulation && (
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
              Ziel {kalkulation.zielFaktor.toString()} · Mindest {kalkulation.mindestFaktorSteuerberater.toString()}
            </p>
          )}
        </div>
      </div>

      {/* 7. Auslastungsrisiko-Modul */}
      {kalkulation && geplanteTotals && (
        <div className={cardCls}>
          <h3 className="mb-3 text-sm font-semibold text-[var(--color-text)]">Auslastungsrisiko</h3>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div>
              <p className="text-xs font-medium text-[var(--color-text-muted)]">Break-Even-Quote</p>
              <p className="text-xl font-bold text-[var(--color-text)]">{breakEvenQuote != null ? `${(breakEvenQuote * 100).toFixed(1)} %` : "–"}</p>
              <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                Auslastungsreserve: {auslastungsreservePunkte != null ? `${auslastungsreservePunkte >= 0 ? "+" : ""}${auslastungsreservePunkte.toFixed(1)} Prozentpunkte` : "–"}
              </p>
            </div>
            <div>
              <p className="mb-2 text-xs font-medium text-[var(--color-text-muted)]">Szenario-Rechner (immer jahresbezogen)</p>
              <SzenarioRechner
                zielFlsStdJahr={kalkulation.zielFlsStdJahr.toNumber()}
                zielQuote={kalkulation.zielQuote.toNumber()}
                stundensatzBasis={kalkulation.stundensatzBasis.toNumber()}
                geplanteGesamtkostenJahr={geplanteTotals.geplanteGesamtkostenJahr}
              />
            </div>
            <div>
              <p className="text-xs font-medium text-[var(--color-text-muted)]">Liquiditäts-Reichweite</p>
              <p className="text-xl font-bold text-[var(--color-text)]">{liquiditaetsReichweiteMonate != null ? `${liquiditaetsReichweiteMonate.toFixed(1)} Monate` : "–"}</p>
              {liquiditaetsReichweiteMonate != null && (
                <span
                  className="mt-2 inline-block rounded-full px-2.5 py-1 text-xs font-semibold"
                  style={{ background: AMPEL_STYLES[ampelLiquiditaet(liquiditaetsReichweiteMonate)].bg, color: AMPEL_STYLES[ampelLiquiditaet(liquiditaetsReichweiteMonate)].text }}
                >
                  {AMPEL_STYLES[ampelLiquiditaet(liquiditaetsReichweiteMonate)].label}
                </span>
              )}
              {letzteLiquiditaet && (
                <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                  Stand {letzteLiquiditaet.datum.toLocaleDateString("de-DE")}: {eur(letzteLiquiditaet.betrag)}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 8. Auslastungsvorschau-Kachel (Verweis auf Kapazitätsansicht) */}
      <div className={cardCls}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-[var(--color-text)]">Auslastungsvorschau</h3>
            <p className="text-2xl font-bold text-[var(--color-text)]">
              Team-Auslastung nächste 8 Wochen: {teamUtilization.auslastungProzent != null ? `${teamUtilization.auslastungProzent.toFixed(0)} %` : "–"}
            </p>
          </div>
          <Link href="/zeit-kapazitaet/kapazitaet" className="text-sm font-medium text-[var(--color-primary)] hover:underline">
            Kapazitätsansicht öffnen →
          </Link>
        </div>
      </div>

      {/* 10. Beitrag pro Mitarbeiter + Ist-Quote */}
      <div>
        <h2 className="mb-3 text-lg font-semibold text-[var(--color-text)]">Beitrag &amp; Ist-Quote pro Mitarbeiter</h2>
        <MitarbeiterTabelle zeilen={mitarbeiterZeilen} />
      </div>

      {/* Referenzwerte-Formular */}
      <KalkulationForm aktuelleWerte={kalkulationWerte} />

      {/* 11. Monats-Erfassungsmaske */}
      <Erfassungsmaske />

      {/* 12. Liquiditäts-Ausblick */}
      <div className={cardCls}>
        <h3 className="mb-1 text-sm font-semibold text-[var(--color-text)]">Liquiditäts-Ausblick</h3>
        <p className="mb-3 text-xs text-[var(--color-text-muted)]">
          Erwarteter Geldeingang (verschoben um {kalkulation?.zahlungsverzugTageJugendamt ?? 45} Tage Zahlungsverzug) neben laufenden Ausgaben. Reine Anzeige, kein Buchhaltungsersatz.
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {liquiditaetAusblick.map((m) => {
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

      {/* 13. Steuerberater-Report-Export */}
      <div className={cardCls}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-[var(--color-text)]">Steuerberater-Report</h3>
            <p className="text-sm text-[var(--color-text-muted)]">PDF mit allen aktuellen Kennzahlen für das nächste Meeting.</p>
          </div>
          <a
            href={`/api/cockpit/report/pdf?type=${periodType}&year=${year}&index=${periodIndex}`}
            className="rounded-[var(--radius-control)] bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--color-primary-hover)]"
          >
            PDF exportieren
          </a>
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
