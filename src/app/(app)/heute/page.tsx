import Link from "next/link";
import { requireUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { getRemainingHoursBulk } from "@/lib/case-helpers";
import { getSettings } from "@/lib/settings";
import { getOwnAufgaben } from "@/lib/aufgaben";
import { HeuteHero } from "./heute-hero";
import { AufgabenListe, type AufgabeRow } from "../aufgaben/aufgaben-list";
import { ProsSectionCard } from "@/components/pros/pros-card";
import { ProsKpiCard } from "@/components/pros/pros-kpi-card";
import { ProsStatusPill } from "@/components/pros/pros-status-pill";
import { ProsProgress } from "@/components/pros/pros-progress";
import { ProsQuickAction } from "@/components/pros/pros-quick-action";
import { ProsTimeline, type ProsTimelineEntry } from "@/components/pros/pros-timeline";

// Icon-Set für KPI-/Schnellzugriff-Kacheln - gleiche Strichstärke wie die Sidebar-Icons
// (design/PROS-DESIGN-SYSTEM.md Abschnitt 13).
function IconPeople() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" />
      <circle cx="18" cy="9" r="2.7" />
      <path d="M15 20c0-2.6 1.6-4.6 4-5.2" />
    </svg>
  );
}
function IconCheck() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <path d="M8 12.5l2.5 2.5L16 9" />
    </svg>
  );
}
function IconCalendarSmall() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <line x1="8" y1="3" x2="8" y2="7" />
      <line x1="16" y1="3" x2="16" y2="7" />
    </svg>
  );
}
function IconDoc() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2h8l4 4v16H6z" />
      <path d="M14 2v5h5M9 12h6M9 16h6" />
    </svg>
  );
}
function IconInvoice() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M15 8.5c-.6-.7-1.7-1.2-3-1.2-2 0-3.5 1.2-3.5 2.8S10 12.9 12 13.2c2 .3 3.5 1 3.5 2.8S13.9 18.7 12 18.7c-1.3 0-2.4-.5-3-1.2" />
      <line x1="12" y1="5.5" x2="12" y2="7.3" />
      <line x1="12" y1="18.7" x2="12" y2="20.5" />
    </svg>
  );
}
function IconPlus() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
function IconFolder() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19V6a2 2 0 0 1 2-2h6l2 3h6a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" />
    </svg>
  );
}
function IconWarn() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3 2 20h20L12 3Z" />
      <line x1="12" y1="9" x2="12" y2="14" />
      <circle cx="12" cy="17" r="0.6" fill="currentColor" />
    </svg>
  );
}
function IconBell() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.7 21a2 2 0 0 1-3.4 0" />
    </svg>
  );
}

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

  const [unreadCount, termineHeute, aufgabenRows] = await Promise.all([
    prisma.messageRecipient.count({ where: { recipientId: user.id, readAt: null } }),
    prisma.appointment.findMany({
      where: { organizerId: user.id, startsAt: { gte: todayStart, lt: tomorrowStart } },
      include: { case: { include: { client: true } } },
      orderBy: { startsAt: "asc" },
    }),
    getOwnAufgaben(user),
  ]);

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
  let faellePreview: { id: string; name: string; helpType: string; usedHours: number; contingent: number; remainingPercent: number; usedPercent: number; warn: boolean }[] = [];
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
      const usedPercent = contingent > 0 ? (usedHours / contingent) * 100 : 0;
      return { id: c.id, name: `${c.client.lastName}, ${c.client.firstName}`, helpType: c.helpType.name, usedHours, contingent, remainingPercent, usedPercent, warn };
    });
  }

  const stats = isVerwaltung
    ? [
        { label: "Termine heute", value: termineHeute.length, icon: <IconCalendarSmall /> },
        { label: "Offene Aufgaben", value: offeneAufgabenCount, icon: <IconCheck /> },
        { label: "Offene Rechnungen", value: offeneRechnungenCount, icon: <IconInvoice /> },
      ]
    : [
        { label: "Aktive Fälle", value: aktiveFaelleCount, icon: <IconPeople />, primary: true },
        { label: "Offene Aufgaben", value: offeneAufgabenCount, icon: <IconCheck /> },
        { label: "Termine heute", value: termineHeute.length, icon: <IconCalendarSmall /> },
        { label: "Dokus diese Woche", value: dokusDieseWocheCount, icon: <IconDoc /> },
      ];

  const timelineEntries: ProsTimelineEntry[] = termineHeute.map((t) => ({
    id: t.id,
    time: t.startsAt.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin" }),
    title: t.title,
    subtitle: t.case ? `${t.case.client.lastName}, ${t.case.client.firstName}` : undefined,
    icon: <IconCalendarSmall />,
  }));

  const quickActions = isVerwaltung
    ? [
        { href: "/calendar", label: "Termin planen", icon: <IconCalendarSmall /> },
        { href: "/aufgaben", label: "Aufgabe erstellen", icon: <IconPlus /> },
        { href: "/finanzen/rechnungen", label: "Rechnungen", icon: <IconInvoice /> },
        { href: "/knowledge-base", label: "Fachbox öffnen", icon: <IconFolder /> },
      ]
    : [
        { href: "/cases/new", label: "Neue Hilfe anlegen", icon: <IconPlus /> },
        { href: "/calendar", label: "Termin planen", icon: <IconCalendarSmall /> },
        { href: "/aufgaben", label: "Aufgabe erstellen", icon: <IconCheck /> },
        { href: "/knowledge-base", label: "Fachbox öffnen", icon: <IconFolder /> },
      ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-end gap-3.5 text-xs text-[var(--pros-meta)]">
        {/* Reale, bestehende Benachrichtigungsfunktion (Link + Unread-Punkt) - hier wiederverwendet statt
            verdoppelt; die Sidebar blendet ihre eigene Bell aus, solange /heute aktiv ist. */}
        <Link href="/messages" className="relative flex h-7 w-7 items-center justify-center rounded-full text-[var(--color-primary)] transition-colors hover:bg-[var(--pros-sage-pale)]" aria-label="Nachrichten">
          <IconBell />
          {unreadCount > 0 && <span className="absolute top-0.5 right-0.5 h-[7px] w-[7px] rounded-full bg-[var(--color-gold)]" />}
        </Link>
        <span>Schön, dass du da bist.</span>
      </div>

      <HeuteHero name={user.name ?? user.email ?? "?"} greeting={greetingForHour(berlinHour())} />

      <div className={`grid grid-cols-1 gap-3.5 sm:grid-cols-2 ${isVerwaltung ? "lg:grid-cols-3" : "lg:grid-cols-4"}`}>
        {stats.map((s) => (
          <div key={s.label} className="dash-card-enter">
            <ProsKpiCard icon={s.icon} value={s.value} label={s.label} primary={"primary" in s && s.primary} />
          </div>
        ))}
      </div>

      <div className={`grid grid-cols-1 gap-4 ${isVerwaltung ? "lg:grid-cols-2" : "lg:grid-cols-[1.02fr_1.14fr_.92fr]"}`}>
        <div className="dash-card-enter">
          <ProsSectionCard title="Heute">
            <ProsTimeline entries={timelineEntries} />
            <Link
              href="/calendar"
              className="mt-2.5 inline-flex items-center gap-2 rounded-[var(--pros-r-sm)] bg-[var(--pros-sage-pale)] px-4 py-2.5 text-sm font-medium text-[var(--color-primary)] transition-colors hover:bg-[var(--pros-sage-soft)]"
            >
              Zum Kalender →
            </Link>
          </ProsSectionCard>
        </div>

        {!isVerwaltung && (
          <div className="dash-card-enter">
            <ProsSectionCard
              title="Meine Fälle"
              action={
                <Link href="/dashboard" className="flex items-center gap-1.5 text-xs text-[#245E61] hover:underline">
                  Alle anzeigen →
                </Link>
              }
            >
              {faellePreview.length === 0 ? (
                <p className="text-sm text-[var(--pros-meta)]">Keine aktiven Fälle.</p>
              ) : (
                <ul className="grid gap-2.5">
                  {faellePreview.map((c) => (
                    <li key={c.id}>
                      <Link
                        href={`/cases/${c.id}`}
                        className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2.5 rounded-[15px] border border-[var(--pros-border-subtle)] bg-white/40 px-2.5 py-[11px] transition-[transform,box-shadow,background-color] duration-[175ms] ease-[var(--pros-ease)] hover:-translate-y-px hover:bg-white hover:shadow-[0_8px_22px_rgba(11,61,70,0.065)]"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="truncate text-sm font-bold text-[var(--color-text)]">{c.name}</span>
                          </div>
                          <div className="mt-0.5 truncate text-xs text-[#738182]">{c.helpType}</div>
                          <div className="mt-2 flex items-center gap-2">
                            <ProsProgress percent={c.usedPercent} warn={c.warn} />
                            <span className="shrink-0 text-[11px] whitespace-nowrap text-[#6C7C7C]">
                              {Math.round(c.usedHours)} von {Math.round(c.contingent)} Std.
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <ProsStatusPill tone={c.warn ? "attention" : "active"}>{c.warn ? "Achtung" : "Aktiv"}</ProsStatusPill>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </ProsSectionCard>
          </div>
        )}

        <div className="grid gap-3.5">
          <div className="dash-card-enter">
            <ProsSectionCard
              title="Aufgaben"
              action={
                <Link href="/aufgaben" className="flex items-center gap-1.5 text-xs text-[#245E61] hover:underline">
                  Alle anzeigen →
                </Link>
              }
            >
              <AufgabenListe aufgaben={aufgabenListe} compact />
            </ProsSectionCard>
          </div>

          {hinweise.length > 0 && (
            <div className="dash-card-enter">
              <ProsSectionCard title="Hinweise">
                <ul className="grid gap-0">
                  {hinweise.slice(0, 4).map((h, i) => (
                    <li key={i} className="grid min-h-[52px] grid-cols-[38px_minmax(0,1fr)] items-center gap-3 border-b border-[var(--pros-border-default)] py-2 last:border-b-0">
                      <span className="grid h-[38px] w-[38px] place-items-center rounded-full bg-[var(--color-gold)] text-[var(--color-primary)] shadow-[0_4px_10px_rgba(227,167,44,0.22)]">
                        <IconWarn />
                      </span>
                      <span className="text-[12px] font-medium text-[var(--color-text)]">{h.text}</span>
                    </li>
                  ))}
                </ul>
              </ProsSectionCard>
            </div>
          )}
        </div>
      </div>

      <div className="dash-card-enter grid grid-cols-1 items-stretch gap-4 lg:grid-cols-[minmax(0,1fr)_150px]">
        <ProsSectionCard title="Schnellzugriff" className="p-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {quickActions.map((a) => (
              <ProsQuickAction key={a.href} href={a.href} icon={a.icon} label={a.label} />
            ))}
          </div>
        </ProsSectionCard>
        {/* Tagline erscheint bewusst genau einmal hier (Main-Bereich), nicht zusätzlich in der Sidebar. */}
        <div className="hidden items-center justify-center lg:flex">
          <p className="font-script -rotate-[5deg] text-center text-[24px] leading-[0.95] text-[var(--color-primary)]">
            Menschen.
            <br />
            Wege.
            <br />
            Möglichkeiten.
            <span className="mx-auto mt-2 block h-[3px] w-[49px] rounded-full bg-[var(--color-gold)]" />
          </p>
        </div>
      </div>
    </div>
  );
}
