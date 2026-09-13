import Link from "next/link";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { prisma } from "@/lib/prisma";
import { requireInterimAdmin } from "@/lib/rbac";
import { getAktuellerOffenerMonat, getMonatsabschlussHistorie } from "./actions";
import { monatsRichtwertStunden } from "@/lib/interim/monatsabschluss";
import { MonatAbschliessenControl, MonatWiederOeffnenButton } from "./monat-abschliessen-control";

const ANGEBOTSART_LABELS: Record<string, string> = {
  ERZIEHUNGSBEISTANDSCHAFT: "Erziehungsbeistandschaft",
  PROS: "PROS",
};

type MonthBucket = { key: string; label: string; hours: number; jahr: number; monat: number };
type CaseHours = { total: number; months: MonthBucket[] };

const cardCls = "rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-soft)]";

export default async function InterimPage() {
  await requireInterimAdmin();

  const [cases, entries, offenerMonat, historie] = await Promise.all([
    prisma.interimCase.findMany({ where: { archived: false }, orderBy: [{ familienname: "asc" }, { vorname: "asc" }] }),
    prisma.interimEntry.findMany({ where: { case: { archived: false } }, select: { caseId: true, date: true, startTime: true, endTime: true } }),
    getAktuellerOffenerMonat(),
    getMonatsabschlussHistorie(),
  ]);

  const hoursByCase = new Map<string, { total: number; months: Map<string, MonthBucket> }>();
  let grandTotal = 0;
  for (const e of entries) {
    const hours = (e.endTime.getTime() - e.startTime.getTime()) / 3600000;
    grandTotal += hours;

    const bucket = hoursByCase.get(e.caseId) ?? { total: 0, months: new Map<string, MonthBucket>() };
    bucket.total += hours;
    const monthKey = format(e.date, "yyyy-MM");
    const month = bucket.months.get(monthKey) ?? {
      key: monthKey,
      label: format(e.date, "MMMM yyyy", { locale: de }),
      hours: 0,
      jahr: e.date.getFullYear(),
      monat: e.date.getMonth() + 1,
    };
    month.hours += hours;
    bucket.months.set(monthKey, month);
    hoursByCase.set(e.caseId, bucket);
  }

  const caseHours = new Map<string, CaseHours>();
  for (const [caseId, bucket] of hoursByCase) {
    caseHours.set(caseId, {
      total: bucket.total,
      months: Array.from(bucket.months.values()).sort((a, b) => b.key.localeCompare(a.key)),
    });
  }

  const offenerMonatKey = `${offenerMonat.jahr}-${String(offenerMonat.monat).padStart(2, "0")}`;
  const geschlosseneMonateSet = new Set(historie.filter((h) => h.status === "ABGESCHLOSSEN").map((h) => `${h.jahr}-${h.monat}`));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-primary)]">Interimsmodus</h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            Übergangslösung bis zur Praxiseröffnung am 1.11. — technisch getrennt vom künftigen Fallsystem.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/interim/tagesansicht"
            className="rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-sm font-semibold text-[var(--color-primary)] shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5"
          >
            Tagesansicht
          </Link>
          <Link
            href="/interim/ueberschneidungen"
            className="rounded-[var(--radius-control)] border border-[var(--color-coral)] bg-[var(--color-surface)] px-4 py-2.5 text-sm font-semibold text-[var(--color-coral)] shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5"
          >
            Zeitüberschneidungen prüfen
          </Link>
          <Link
            href="/interim/new"
            className="rounded-[var(--radius-control)] bg-[var(--color-gold)] px-4 py-2.5 text-sm font-semibold text-white shadow-[var(--shadow-soft)] transition hover:opacity-90"
          >
            + Neuen Fall anlegen
          </Link>
        </div>
      </div>

      <div className={`${cardCls} flex flex-wrap items-center justify-between gap-4`}>
        <div>
          <p className="text-xs font-medium text-[var(--color-text-muted)]">Aktueller offener Monat</p>
          <p className="mt-1 text-2xl font-bold text-[var(--color-primary)]">{offenerMonat.label}</p>
          <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">Dokumentierte Stunden gesamt (alle Fälle): {grandTotal.toFixed(2)} Std.</p>
        </div>
        <MonatAbschliessenControl jahr={offenerMonat.jahr} monat={offenerMonat.monat} label={offenerMonat.label} />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cases.map((c) => {
          const hours = caseHours.get(c.id);
          const offenerMonatBucket = hours?.months.find((m) => m.key === offenerMonatKey);
          const richtwert = monatsRichtwertStunden(c.bewilligteWochenstunden.toNumber());
          const fruehereMonate = (hours?.months ?? []).filter((m) => m.key !== offenerMonatKey);

          return (
            <div key={c.id} className={`${cardCls} transition hover:-translate-y-0.5 hover:shadow-md`}>
              <Link href={`/interim/${c.id}`}>
                <span className="mb-2 inline-block rounded-full bg-[var(--color-primary-soft)] px-2.5 py-0.5 text-[11px] font-semibold text-[var(--color-primary)]">
                  {ANGEBOTSART_LABELS[c.angebotsart]}
                </span>
                <h3 className="text-sm font-semibold text-[var(--color-text)]">
                  {c.familienname}, {c.vorname}
                </h3>
                <p className="mt-1 text-xs text-[var(--color-text-muted)]">{c.plzOrt}</p>
              </Link>

              <div className="mt-3 border-t border-[var(--color-border)] pt-2.5">
                <p className="text-xs font-medium text-[var(--color-text-muted)]">{offenerMonat.label} (offen)</p>
                <p className="text-sm font-semibold text-[var(--color-text)]">
                  {(offenerMonatBucket?.hours ?? 0).toFixed(2)} Std. dokumentiert{" "}
                  <span className="font-normal text-[var(--color-text-muted)]">· Richtwert ~{richtwert.toFixed(1)} Std./Monat</span>
                </p>
              </div>

              {fruehereMonate.length > 0 && (
                <details className="mt-2.5">
                  <summary className="cursor-pointer text-xs font-medium text-[var(--color-primary)]">Frühere Monate</summary>
                  <ul className="mt-1.5 flex flex-col gap-1 text-xs text-[var(--color-text-muted)]">
                    {fruehereMonate.map((m) => (
                      <li key={m.key} className="flex items-center justify-between gap-2">
                        <span>
                          {m.label}: {m.hours.toFixed(2)} Std.
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            geschlosseneMonateSet.has(`${m.jahr}-${m.monat}`)
                              ? "bg-[var(--color-border)] text-[var(--color-text)]"
                              : "bg-[var(--color-primary-soft)] text-[var(--color-primary)]"
                          }`}
                        >
                          {geschlosseneMonateSet.has(`${m.jahr}-${m.monat}`) ? "abgeschlossen" : "offen"}
                        </span>
                      </li>
                    ))}
                  </ul>
                </details>
              )}

              <p className="mt-2.5 text-xs text-[var(--color-text-muted)]">Angelegt am {format(c.createdAt, "dd.MM.yyyy", { locale: de })}</p>
            </div>
          );
        })}
        {cases.length === 0 && <p className="text-sm text-[var(--color-text-muted)]">Noch keine Fälle im Interimsmodus angelegt.</p>}
      </div>

      {historie.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-semibold text-[var(--color-text)]">Monats-Historie</h2>
          <div className="flex flex-col gap-2.5">
            {historie.map((h) => (
              <div key={`${h.jahr}-${h.monat}`} className={`${cardCls} flex flex-wrap items-center justify-between gap-3`}>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-[var(--color-text)]">{h.label}</span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        h.status === "ABGESCHLOSSEN" ? "bg-[var(--color-border)] text-[var(--color-text)]" : "bg-[var(--color-primary-soft)] text-[var(--color-primary)]"
                      }`}
                    >
                      {h.status === "ABGESCHLOSSEN" ? "abgeschlossen" : "wieder geöffnet"}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
                    Abgeschlossen am {h.abgeschlossenAmLabel} von {h.abgeschlossenVonName}
                    {h.wiederGeoeffnetAmLabel && ` · Zuletzt wieder geöffnet am ${h.wiederGeoeffnetAmLabel} von ${h.wiederGeoeffnetVonName}`}
                  </p>
                </div>
                {h.status === "ABGESCHLOSSEN" && <MonatWiederOeffnenButton jahr={h.jahr} monat={h.monat} label={h.label} />}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
