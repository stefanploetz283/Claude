import Link from "next/link";
import { requireUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { getRemainingHoursBulk } from "@/lib/case-helpers";
import { getSettings } from "@/lib/settings";
import { getOwnAufgaben } from "@/lib/aufgaben";
import { HeuteHero } from "./heute-hero";
import { AufgabenListe, type AufgabeRow } from "../aufgaben/aufgaben-list";

function berlinHour() {
  return Number(new Date().toLocaleString("en-US", { timeZone: "Europe/Berlin", hour: "2-digit", hour12: false }));
}
function greetingForHour(hour: number) {
  if (hour < 11) return "Guten Morgen";
  if (hour < 18) return "Guten Tag";
  return "Guten Abend";
}

type Hinweis = { text: string; level: "warn" | "info" };

export default async function HeutePage() {
  const user = await requireUser();
  const settings = await getSettings();
  const isVerwaltung = user.role === "VERWALTUNG";

  const now = new Date();
  const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const tomorrowStart = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
  const weekStart = new Date(todayStart.getTime() - ((todayStart.getUTCDay() + 6) % 7) * 24 * 60 * 60 * 1000);

  const [dbUser, termineHeute, aufgabenRows] = await Promise.all([
    prisma.user.findUnique({ where: { id: user.id }, select: { avatarUrl: true } }),
    prisma.appointment.findMany({
      where: { organizerId: user.id, startsAt: { gte: todayStart, lt: tomorrowStart } },
      include: { case: { include: { client: true } } },
      orderBy: { startsAt: "asc" },
    }),
    getOwnAufgaben(user),
  ]);

  const avatarSrc = dbUser?.avatarUrl ? `/api/users/${user.id}/avatar` : null;
  const offeneAufgabenCount = aufgabenRows.length;
  const aufgabenListe: AufgabeRow[] = aufgabenRows.slice(0, 5).map((a) => ({
    id: a.id,
    titel: a.titel,
    faelligAm: a.faelligAm ? a.faelligAm.toISOString().slice(0, 10) : null,
    erledigt: a.erledigt,
    clientName: a.case ? `${a.case.client.lastName}, ${a.case.client.firstName}` : null,
  }));

  let aktiveFaelleCount = 0;
  let dokusDieseWocheCount = 0;
  let offeneRechnungenCount = 0;
  let faellePreview: { id: string; name: string; helpType: string; remaining: number; contingent: number; remainingPercent: number; warn: boolean }[] = [];
  const hinweise: Hinweis[] = [];

  if (isVerwaltung) {
    offeneRechnungenCount = await prisma.invoice.count({ where: { status: "OFFEN" } });
    const ueberfaellig = await prisma.invoice.findMany({
      where: { status: "OFFEN", issuedAt: { lt: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000) } },
      take: 3,
    });
    for (const r of ueberfaellig) hinweise.push({ text: `Rechnung ${r.number} ist seit über 60 Tagen offen.`, level: "warn" });
  } else {
    const ownVisibility = { OR: [{ assignedEmployeeId: user.id }, { substituteEmployeeId: user.id }] };
    const [activeCount, weekDocsCount, ownCases] = await Promise.all([
      prisma.case.count({ where: { archived: false, status: "ACTIVE", ...ownVisibility } }),
      prisma.serviceEntry.count({ where: { employeeId: user.id, date: { gte: weekStart } } }),
      prisma.case.findMany({
        where: { archived: false, status: "ACTIVE", ...ownVisibility },
        include: { client: true, helpType: true },
        orderBy: { updatedAt: "desc" },
        take: 3,
      }),
    ]);
    aktiveFaelleCount = activeCount;
    dokusDieseWocheCount = weekDocsCount;

    const remainingMap = await getRemainingHoursBulk(ownCases.map((c) => c.id));
    const threshold = settings.contingentWarningThreshold;
    faellePreview = ownCases.map((c) => {
      const usedHours = remainingMap.get(c.id) ?? 0;
      const contingent = c.hoursContingent.toNumber();
      const remaining = contingent - usedHours;
      const remainingPercent = contingent > 0 ? (remaining / contingent) * 100 : 0;
      const warn = remainingPercent <= threshold;
      if (warn) hinweise.push({ text: `${c.client.lastName}, ${c.client.firstName}: Kontingent bei ${Math.round(remainingPercent)} %.`, level: "warn" });
      if (c.expectedEndDate) {
        const daysLeft = Math.round((c.expectedEndDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
        if (daysLeft >= 0 && daysLeft <= (c.reminderLeadDays ?? 14)) {
          hinweise.push({ text: `${c.client.lastName}, ${c.client.firstName}: Hilfezeitraum endet in ${daysLeft} Tagen.`, level: "warn" });
        }
      }
      return { id: c.id, name: `${c.client.lastName}, ${c.client.firstName}`, helpType: c.helpType.name, remaining, contingent, remainingPercent, warn };
    });
  }

  const stats = isVerwaltung
    ? [
        { label: "Termine heute", value: termineHeute.length },
        { label: "Offene Aufgaben", value: offeneAufgabenCount },
        { label: "Offene Rechnungen", value: offeneRechnungenCount },
      ]
    : [
        { label: "Aktive Fälle", value: aktiveFaelleCount, emphasize: true },
        { label: "Offene Aufgaben", value: offeneAufgabenCount },
        { label: "Termine heute", value: termineHeute.length },
        { label: "Dokus diese Woche", value: dokusDieseWocheCount },
      ];

  return (
    <div className="flex flex-col gap-6">
      <HeuteHero name={user.name ?? user.email ?? "?"} greeting={greetingForHour(berlinHour())} avatarUrl={avatarSrc} />

      <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 ${isVerwaltung ? "lg:grid-cols-3" : "lg:grid-cols-4"}`}>
        {stats.map((s) => (
          <div
            key={s.label}
            className={`dash-card-enter rounded-[var(--radius-card)] p-5 shadow-[var(--shadow-soft)] ${
              "emphasize" in s && s.emphasize ? "bg-[var(--color-primary)] text-white" : "bg-[var(--color-surface)] text-[var(--color-text)]"
            }`}
          >
            <div className="text-[28px] leading-none font-bold">{s.value}</div>
            <div className={`mt-1.5 text-sm font-medium ${"emphasize" in s && s.emphasize ? "text-white/80" : "text-[var(--color-text-muted)]"}`}>
              {s.label}
            </div>
          </div>
        ))}
      </div>

      <div className={`grid grid-cols-1 gap-4 ${isVerwaltung ? "lg:grid-cols-2" : "lg:grid-cols-3"}`}>
        <div className="dash-card-enter rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-soft)]">
          <h2 className="mb-3 text-sm font-semibold text-[var(--color-text)]">Heute</h2>
          {termineHeute.length === 0 ? (
            <p className="text-sm text-[var(--color-text-muted)]">Keine Termine heute.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {termineHeute.map((t) => (
                <li key={t.id} className="flex gap-3 border-l-2 border-[var(--color-gold)] pl-3">
                  <div className="w-12 shrink-0 text-xs font-semibold text-[var(--color-text-muted)]">
                    {t.startsAt.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin" })}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-[var(--color-text)]">{t.title}</div>
                    {t.case && <div className="truncate text-xs text-[var(--color-text-muted)]">{t.case.client.lastName}, {t.case.client.firstName}</div>}
                  </div>
                </li>
              ))}
            </ul>
          )}
          <Link href="/calendar" className="mt-4 inline-block text-sm font-medium text-[var(--color-primary)] hover:underline">
            Zum Kalender →
          </Link>
        </div>

        {!isVerwaltung && (
          <div className="dash-card-enter rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-soft)]">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[var(--color-text)]">Meine Fälle</h2>
              <Link href="/dashboard" className="text-xs font-medium text-[var(--color-primary)] hover:underline">
                Alle anzeigen →
              </Link>
            </div>
            {faellePreview.length === 0 ? (
              <p className="text-sm text-[var(--color-text-muted)]">Keine aktiven Fälle.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {faellePreview.map((c) => (
                  <li key={c.id}>
                    <Link href={`/cases/${c.id}`} className="block rounded-[var(--radius-control)] px-1 py-1 transition-colors hover:bg-[var(--color-bg)]">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-medium text-[var(--color-text)]">{c.name}</span>
                        <span className={`shrink-0 text-xs font-semibold ${c.warn ? "text-[var(--color-warn-text)]" : "text-[var(--color-text-muted)]"}`}>
                          {Math.round(c.remainingPercent)} %
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-bg)]">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${Math.max(0, Math.min(100, c.remainingPercent))}%`, background: c.warn ? "var(--color-gold)" : "var(--color-primary)" }}
                        />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="flex flex-col gap-4">
          <div className="dash-card-enter rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-soft)]">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[var(--color-text)]">Aufgaben</h2>
              <Link href="/aufgaben" className="text-xs font-medium text-[var(--color-primary)] hover:underline">
                Alle anzeigen →
              </Link>
            </div>
            <AufgabenListe aufgaben={aufgabenListe} compact />
          </div>

          {hinweise.length > 0 && (
            <div className="dash-card-enter rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-soft)]">
              <h2 className="mb-3 text-sm font-semibold text-[var(--color-text)]">Hinweise</h2>
              <ul className="flex flex-col gap-2.5">
                {hinweise.slice(0, 4).map((h, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-[var(--color-text)]">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-gold)]" />
                    {h.text}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
