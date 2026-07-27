import Link from "next/link";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addMonths,
  addWeeks,
  format,
  isSameMonth,
  isSameDay,
} from "date-fns";
import { de } from "date-fns/locale";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/rbac";
import { AppointmentForm } from "./appointment-form";
import { DeleteAppointmentButton } from "./delete-button";
import type { Prisma } from "@prisma/client";

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await requireUser();
  const params = await searchParams;

  const view = params.view === "week" ? "week" : "month";
  const refDate = params.date ? new Date(params.date) : new Date();

  const rangeStart = view === "month" ? startOfWeek(startOfMonth(refDate), { weekStartsOn: 1 }) : startOfWeek(refDate, { weekStartsOn: 1 });
  const rangeEnd = view === "month" ? endOfWeek(endOfMonth(refDate), { weekStartsOn: 1 }) : endOfWeek(refDate, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: rangeStart, end: rangeEnd });

  const visibility: Prisma.AppointmentWhereInput =
    user.role === "ADMIN"
      ? {}
      : { OR: [{ organizerId: user.id }, { case: { OR: [{ assignedEmployeeId: user.id }, { substituteEmployeeId: user.id }] } }] };

  const [appointments, cases, upcoming] = await Promise.all([
    prisma.appointment.findMany({
      where: { ...visibility, startsAt: { gte: rangeStart }, endsAt: { lte: rangeEnd } },
      include: { case: { include: { client: true } }, organizer: true },
      orderBy: { startsAt: "asc" },
    }),
    prisma.case.findMany({
      where:
        user.role === "ADMIN"
          ? { archived: false }
          : { archived: false, OR: [{ assignedEmployeeId: user.id }, { substituteEmployeeId: user.id }] },
      include: { client: true, helpType: true },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.appointment.findMany({
      where: { ...visibility, startsAt: { gte: new Date() } },
      include: { case: { include: { client: true } } },
      orderBy: { startsAt: "asc" },
      take: 20,
    }),
  ]);

  const now = new Date();
  const dueReminders = upcoming.filter((a) => {
    const minutesUntil = (a.startsAt.getTime() - now.getTime()) / 60000;
    return minutesUntil >= 0 && minutesUntil <= (a.reminderMinutesBefore ?? 60);
  });

  const caseOptions = cases.map((c) => ({ id: c.id, label: `${c.client.lastName}, ${c.client.firstName} (${c.helpType.name})` }));

  const prevDate = view === "month" ? addMonths(refDate, -1) : addWeeks(refDate, -1);
  const nextDate = view === "month" ? addMonths(refDate, 1) : addWeeks(refDate, 1);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-primary)]">Terminkalender</h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">Termine anlegen und verwalten, optional mit Fallbezug.</p>
      </div>

      {dueReminders.length > 0 && (
        <div className="rounded-[var(--radius-card)] border border-[#f4b83f]/40 bg-[#fdf3dc] p-4 text-sm text-[#8a5a12]">
          <p className="mb-1 font-semibold">Bevorstehende Termine:</p>
          {dueReminders.map((a) => (
            <div key={a.id}>
              ⏰ {a.title} – {format(a.startsAt, "dd.MM.yyyy HH:mm", { locale: de })}
              {a.case && ` (${a.case.client.lastName}, ${a.case.client.firstName})`}
            </div>
          ))}
        </div>
      )}

      <AppointmentForm cases={caseOptions} defaultDate={format(refDate, "yyyy-MM-dd")} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 text-sm">
          <Link
            href={`/calendar?view=${view}&date=${format(prevDate, "yyyy-MM-dd")}`}
            className="rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 font-medium text-[var(--color-text)] transition hover:bg-[var(--color-primary-soft)]"
          >
            ← Zurück
          </Link>
          <span className="font-semibold text-[var(--color-text)]">
            {view === "month" ? format(refDate, "MMMM yyyy", { locale: de }) : `KW ${format(refDate, "II/yyyy")}`}
          </span>
          <Link
            href={`/calendar?view=${view}&date=${format(nextDate, "yyyy-MM-dd")}`}
            className="rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 font-medium text-[var(--color-text)] transition hover:bg-[var(--color-primary-soft)]"
          >
            Weiter →
          </Link>
        </div>
        <div className="flex gap-1.5 text-sm">
          <Link
            href={`/calendar?view=month&date=${format(refDate, "yyyy-MM-dd")}`}
            className={`rounded-[var(--radius-control)] px-4 py-1.5 font-medium transition ${
              view === "month" ? "bg-[var(--color-primary)] text-white shadow-[var(--shadow-soft)]" : "border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] hover:bg-[var(--color-primary-soft)]"
            }`}
          >
            Monat
          </Link>
          <Link
            href={`/calendar?view=week&date=${format(refDate, "yyyy-MM-dd")}`}
            className={`rounded-[var(--radius-control)] px-4 py-1.5 font-medium transition ${
              view === "week" ? "bg-[var(--color-primary)] text-white shadow-[var(--shadow-soft)]" : "border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] hover:bg-[var(--color-primary-soft)]"
            }`}
          >
            Woche
          </Link>
        </div>
      </div>

      {view === "month" ? (
        <div className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-soft)]">
          <div className="grid grid-cols-7 bg-[var(--color-primary-soft)]">
            {["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].map((d) => (
              <div key={d} className="px-2 py-2.5 text-center text-[11px] font-bold tracking-wide text-[var(--color-primary)] uppercase">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2 p-2">
            {days.map((day) => {
              const dayAppointments = appointments.filter((a) => isSameDay(a.startsAt, day));
              return (
                <div
                  key={day.toISOString()}
                  className={`min-h-[100px] rounded-[10px] border border-[var(--color-border)] p-2 ${
                    isSameMonth(day, refDate) ? "bg-[var(--color-surface)]" : "bg-[var(--color-bg)]"
                  }`}
                >
                  <div className={`text-xs font-semibold ${isSameMonth(day, refDate) ? "text-[var(--color-text)]" : "text-[var(--color-text-muted)]"}`}>
                    {format(day, "d")}
                  </div>
                  <div className="mt-1.5 flex flex-col gap-1">
                    {dayAppointments.map((a) => (
                      <div key={a.id} className="group rounded-md bg-[var(--color-primary-soft)] px-1.5 py-1 text-[11px] text-[var(--color-primary)]">
                        <div className="font-semibold">
                          {format(a.startsAt, "HH:mm")} {a.title}
                        </div>
                        {a.case && <div className="text-[var(--color-text-muted)]">{a.case.client.lastName}</div>}
                        <DeleteAppointmentButton id={a.id} />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {days.map((day) => {
            const dayAppointments = appointments.filter((a) => isSameDay(a.startsAt, day));
            return (
              <div key={day.toISOString()} className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-soft)]">
                <h3 className="mb-2 text-sm font-semibold text-[var(--color-primary)]">{format(day, "EEEE, dd.MM.yyyy", { locale: de })}</h3>
                {dayAppointments.length === 0 && <p className="text-sm text-[var(--color-text-muted)]">Keine Termine.</p>}
                <ul className="flex flex-col gap-2">
                  {dayAppointments.map((a) => (
                    <li key={a.id} className="flex items-center justify-between rounded-[var(--radius-control)] bg-[var(--color-bg)] px-3.5 py-2.5 text-sm">
                      <div>
                        <span className="font-semibold text-[var(--color-text)]">
                          {format(a.startsAt, "HH:mm")}–{format(a.endsAt, "HH:mm")} {a.title}
                        </span>
                        {a.case && <div className="text-[var(--color-text-muted)]">{a.case.client.lastName}, {a.case.client.firstName}</div>}
                        {a.location && <div className="text-[var(--color-text-muted)]">📍 {a.location}</div>}
                      </div>
                      <DeleteAppointmentButton id={a.id} />
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
