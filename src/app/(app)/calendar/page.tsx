import Link from "next/link";
import { addDays, addWeeks, eachDayOfInterval, endOfWeek, format, startOfWeek } from "date-fns";
import { de } from "date-fns/locale";
import { prisma } from "@/lib/prisma";
import { requireUser, caseVisibilityWhere } from "@/lib/rbac";
import { sorgeFuerSlotAbdeckung } from "@/lib/termine/slot-generierung";
import { employeeColor } from "@/lib/fahrtenrechner/employee-colors";
import { KATEGORIE_LABEL, TERMINART_LABEL, STANDORT_LABEL } from "@/lib/termine/labels";
import { Tageskalender, type KalenderBlock, type KalenderMitarbeiterin } from "./tageskalender";
import { Wochenuebersicht, type WochenTermin } from "./wochenuebersicht";
import type { Prisma } from "@prisma/client";

export default async function CalendarPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireUser();
  const params = await searchParams;

  const view = params.view === "week" ? "week" : "day";
  const refDate = params.date ? new Date(`${params.date}T00:00:00`) : new Date();
  const standortFilter = params.standort === "NITTENDORF" || params.standort === "REGENSBURG" ? params.standort : null;
  const raumFilter = params.raumId?.trim() || null;

  const isVerwaltend = user.role === "ADMIN" || user.role === "VERWALTUNG";

  const mitarbeiterinnenRows = isVerwaltend
    ? await prisma.user.findMany({ where: { role: { in: ["EMPLOYEE", "ADMIN"] }, active: true }, orderBy: { name: "asc" } })
    : await prisma.user.findMany({ where: { id: user.id } });

  const mitarbeiterinnen: KalenderMitarbeiterin[] = mitarbeiterinnenRows.map((m, i) => ({
    id: m.id,
    name: m.name,
    color: m.calendarColor ?? employeeColor(i),
  }));
  const employeeIds = mitarbeiterinnen.map((m) => m.id);

  await sorgeFuerSlotAbdeckung(employeeIds);

  const [raeume, caseOptionsRows] = await Promise.all([
    prisma.raum.findMany({ where: { aktiv: true }, orderBy: [{ standort: "asc" }, { name: "asc" }] }),
    prisma.case.findMany({
      where: { ...caseVisibilityWhere(user), status: { not: "COMPLETED" } },
      include: { client: true, helpType: true },
      orderBy: [{ client: { lastName: "asc" } }],
    }),
  ]);
  const caseOptions = caseOptionsRows.map((c) => ({ id: c.id, label: `${c.client.lastName}, ${c.client.firstName} (${c.helpType.name})`, employeeId: c.assignedEmployeeId }));
  const raumOptions = raeume.map((r) => ({ id: r.id, label: r.standort ? `${r.name} (${STANDORT_LABEL[r.standort]})` : r.name, standort: r.standort }));

  const rangeStart = view === "day" ? refDate : startOfWeek(refDate, { weekStartsOn: 1 });
  const rangeEnd = view === "day" ? refDate : endOfWeek(refDate, { weekStartsOn: 1 });
  const rangeFrom = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), rangeStart.getDate(), 0, 0, 0);
  const rangeTo = new Date(rangeEnd.getFullYear(), rangeEnd.getMonth(), rangeEnd.getDate(), 23, 59, 59);

  const raumWhere: Prisma.RaumWhereInput | undefined = raumFilter ? { id: raumFilter } : standortFilter ? { standort: standortFilter } : undefined;
  const passendeRaeume = raumWhere ? await prisma.raum.findMany({ where: raumWhere, select: { id: true } }) : null;
  const passendeRaumIds = passendeRaeume ? new Set(passendeRaeume.map((r) => r.id)) : null;

  const [slots, adHocTermine] = await Promise.all([
    prisma.terminSlot.findMany({
      where: { employeeId: { in: employeeIds }, datum: { gte: rangeFrom, lte: rangeTo } },
      include: {
        vorlage: { select: { raumId: true, label: true } },
        termine: { where: { status: "GEPLANT" }, include: { case: { include: { client: true } }, raum: true } },
      },
    }),
    prisma.termin.findMany({
      where: { employeeId: { in: employeeIds }, slotId: null, status: "GEPLANT", startsAt: { gte: rangeFrom, lte: rangeTo } },
      include: { case: { include: { client: true } }, raum: true },
    }),
  ]);

  function terminZuBlockDaten(t: { id: string; titel: string; kategorie: string; terminArt: string | null; raum: { name: string } | null; case: { client: { lastName: string; firstName: string } } | null }) {
    return {
      id: t.id,
      titel: t.titel,
      kategorieLabel: KATEGORIE_LABEL[t.kategorie as keyof typeof KATEGORIE_LABEL],
      terminArtLabel: t.terminArt ? TERMINART_LABEL[t.terminArt as keyof typeof TERMINART_LABEL] : null,
      raumName: t.raum?.name ?? null,
      clientName: t.case ? `${t.case.client.lastName}, ${t.case.client.firstName}` : null,
    };
  }

  const bloecke: KalenderBlock[] = [];
  for (const slot of slots) {
    const startMinute = Math.round((slot.startZeit.getTime() - new Date(slot.datum).setHours(0, 0, 0, 0)) / 60000);
    const endMinute = Math.round((slot.endZeit.getTime() - new Date(slot.datum).setHours(0, 0, 0, 0)) / 60000);
    const tagIso = format(slot.datum, "yyyy-MM-dd");
    const termin = slot.termine[0] ?? null;
    const raumId = termin?.raum ? undefined : (slot.vorlage?.raumId ?? null);
    if (passendeRaumIds && !termin?.raum && slot.vorlage?.raumId && !passendeRaumIds.has(slot.vorlage.raumId)) continue;
    if (passendeRaumIds && termin?.raum && !passendeRaumIds.has(termin.raum.id)) continue;
    if (slot.status === "STORNIERT") continue;

    bloecke.push({
      key: `slot-${slot.id}`,
      employeeId: slot.employeeId,
      tagIso,
      startMinute,
      endMinute,
      kind: slot.status === "GEBUCHT" && termin ? "termin" : "frei",
      slotId: slot.id,
      slotVorlageRaumId: raumId ?? null,
      termin: termin ? terminZuBlockDaten(termin) : null,
    });
  }
  for (const t of adHocTermine) {
    if (passendeRaumIds && t.raum && !passendeRaumIds.has(t.raum.id)) continue;
    const tagStart = new Date(t.startsAt);
    tagStart.setHours(0, 0, 0, 0);
    bloecke.push({
      key: `termin-${t.id}`,
      employeeId: t.employeeId,
      tagIso: format(t.startsAt, "yyyy-MM-dd"),
      startMinute: Math.round((t.startsAt.getTime() - tagStart.getTime()) / 60000),
      endMinute: Math.round((t.endsAt.getTime() - tagStart.getTime()) / 60000),
      kind: "termin",
      slotId: null,
      slotVorlageRaumId: null,
      termin: terminZuBlockDaten(t),
    });
  }

  // Reminder-Hinweis (In-App, siehe Prompt Punkt 7 - echte Push-Benachrichtigungen sind bewusst nicht Teil
  // dieser Version, siehe Plan): bevorstehende Termine im jeweiligen Erinnerungsfenster.
  const now = new Date();
  const reminderWhere: Prisma.TerminWhereInput = user.role === "ADMIN" ? {} : { OR: [{ employeeId: user.id }, { bookedById: user.id }] };
  const upcoming = await prisma.termin.findMany({
    where: { ...reminderWhere, status: "GEPLANT", startsAt: { gte: now } },
    include: { case: { include: { client: true } }, employee: true },
    orderBy: { startsAt: "asc" },
    take: 30,
  });
  const dueReminders = upcoming.filter((t) => {
    const minutesUntil = (t.startsAt.getTime() - now.getTime()) / 60000;
    return minutesUntil >= 0 && minutesUntil <= (t.reminderMinutesBefore ?? 60);
  });

  const prevDate = view === "day" ? addDays(refDate, -1) : addWeeks(refDate, -1);
  const nextDate = view === "day" ? addDays(refDate, 1) : addWeeks(refDate, 1);
  const weekDays = view === "week" ? eachDayOfInterval({ start: rangeStart, end: rangeEnd }) : [];

  const wochenTermine: WochenTermin[] = bloecke
    .filter((b) => b.kind === "termin" && b.termin)
    .map((b) => {
      const m = mitarbeiterinnen.find((x) => x.id === b.employeeId)!;
      return {
        key: b.key,
        tagIso: b.tagIso,
        startMinute: b.startMinute,
        endMinute: b.endMinute,
        mitarbeiterinName: m.name,
        mitarbeiterinColor: m.color,
        titel: b.termin!.titel,
        kategorieLabel: b.termin!.kategorieLabel,
        raumName: b.termin!.raumName,
        clientName: b.termin!.clientName,
      };
    });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-primary)]">Terminkalender</h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">Praxistermine buchen, Räume mitbelegen, Auslastung im Blick behalten.</p>
        </div>
        {isVerwaltend && (
          <div className="flex gap-2">
            <Link
              href="/calendar/wochenvorlagen"
              className="rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2 text-sm font-medium text-[var(--color-text)] transition hover:bg-[var(--color-primary-soft)]"
            >
              Wochenvorlagen
            </Link>
            <Link
              href="/calendar/raeume"
              className="rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2 text-sm font-medium text-[var(--color-text)] transition hover:bg-[var(--color-primary-soft)]"
            >
              Räume
            </Link>
          </div>
        )}
      </div>

      {dueReminders.length > 0 && (
        <div className="rounded-[var(--radius-card)] border border-[var(--color-gold)]/40 bg-[var(--color-warn-soft)] p-4 text-sm text-[var(--color-warn-text)]">
          <p className="mb-1 font-semibold">Bevorstehende Termine:</p>
          {dueReminders.map((t) => (
            <div key={t.id}>
              ⏰ {t.titel} – {format(t.startsAt, "dd.MM.yyyy HH:mm", { locale: de })} ({t.employee.name})
              {t.case && ` · ${t.case.client.lastName}, ${t.case.client.firstName}`}
            </div>
          ))}
        </div>
      )}

      <form method="get" className="flex flex-wrap items-center gap-2 text-sm">
        <input type="hidden" name="view" value={view} />
        <input type="hidden" name="date" value={format(refDate, "yyyy-MM-dd")} />
        <select name="standort" defaultValue={standortFilter ?? ""} className={selectCls}>
          <option value="">Alle Standorte</option>
          <option value="NITTENDORF">Nittendorf</option>
          <option value="REGENSBURG">Regensburg</option>
        </select>
        <select name="raumId" defaultValue={raumFilter ?? ""} className={selectCls}>
          <option value="">Alle Räume</option>
          {raumOptions.map((r) => (
            <option key={r.id} value={r.id}>
              {r.label}
            </option>
          ))}
        </select>
        <button type="submit" className={btnCls}>
          Filtern
        </button>
      </form>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 text-sm">
          <Link href={`/calendar?view=${view}&date=${format(prevDate, "yyyy-MM-dd")}`} className={btnCls}>
            ← Zurück
          </Link>
          <span className="font-semibold text-[var(--color-text)]">
            {view === "day" ? format(refDate, "EEEE, dd.MM.yyyy", { locale: de }) : `KW ${format(refDate, "II/yyyy")}`}
          </span>
          <Link href={`/calendar?view=${view}&date=${format(nextDate, "yyyy-MM-dd")}`} className={btnCls}>
            Weiter →
          </Link>
        </div>
        <div className="flex gap-1.5 text-sm">
          <Link href={`/calendar?view=day&date=${format(refDate, "yyyy-MM-dd")}`} className={tabCls(view === "day")}>
            Tag
          </Link>
          <Link href={`/calendar?view=week&date=${format(refDate, "yyyy-MM-dd")}`} className={tabCls(view === "week")}>
            Woche
          </Link>
        </div>
      </div>

      {view === "day" ? (
        <Tageskalender
          tagIso={format(refDate, "yyyy-MM-dd")}
          mitarbeiterinnen={mitarbeiterinnen}
          bloecke={bloecke.filter((b) => b.tagIso === format(refDate, "yyyy-MM-dd"))}
          caseOptions={caseOptions}
          raumOptions={raumOptions}
          canBookForOthers={isVerwaltend}
          canOverrideConflicts={isVerwaltend}
          currentUserId={user.id}
        />
      ) : (
        <Wochenuebersicht
          tage={weekDays.map((d) => ({ iso: format(d, "yyyy-MM-dd"), label: format(d, "EEEE, dd.MM.", { locale: de }) }))}
          termine={wochenTermine}
        />
      )}
    </div>
  );
}

const selectCls = "rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1.5 text-sm text-[var(--color-text)]";
const btnCls =
  "rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-1.5 text-sm font-medium text-[var(--color-text)] transition hover:bg-[var(--color-primary-soft)]";
function tabCls(active: boolean) {
  return `rounded-[var(--radius-control)] px-4 py-1.5 font-medium transition ${
    active ? "bg-[var(--color-primary)] text-white shadow-[var(--shadow-soft)]" : "border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] hover:bg-[var(--color-primary-soft)]"
  }`;
}
