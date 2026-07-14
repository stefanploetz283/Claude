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
      include: { client: true },
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

  const caseOptions = cases.map((c) => ({ id: c.id, label: `${c.client.lastName}, ${c.client.firstName} (${c.caseNumber})` }));

  const prevDate = view === "month" ? addMonths(refDate, -1) : addWeeks(refDate, -1);
  const nextDate = view === "month" ? addMonths(refDate, 1) : addWeeks(refDate, 1);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-[var(--color-text)]">Terminkalender</h1>
        <p className="mt-1 text-sm text-black/60">Termine anlegen und verwalten, optional mit Fallbezug.</p>
      </div>

      {dueReminders.length > 0 && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="mb-1 font-medium">Bevorstehende Termine:</p>
          {dueReminders.map((a) => (
            <div key={a.id}>
              ⏰ {a.title} – {format(a.startsAt, "dd.MM.yyyy HH:mm", { locale: de })}
              {a.case && ` (${a.case.client.lastName}, ${a.case.client.firstName})`}
            </div>
          ))}
        </div>
      )}

      <AppointmentForm cases={caseOptions} defaultDate={format(refDate, "yyyy-MM-dd")} />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-sm">
          <Link href={`/calendar?view=${view}&date=${format(prevDate, "yyyy-MM-dd")}`} className="rounded-md border border-black/15 px-2 py-1 hover:bg-black/5">
            ← Zurück
          </Link>
          <span className="font-medium">{view === "month" ? format(refDate, "MMMM yyyy", { locale: de }) : `KW ${format(refDate, "II/yyyy")}`}</span>
          <Link href={`/calendar?view=${view}&date=${format(nextDate, "yyyy-MM-dd")}`} className="rounded-md border border-black/15 px-2 py-1 hover:bg-black/5">
            Weiter →
          </Link>
        </div>
        <div className="flex gap-1 text-sm">
          <Link
            href={`/calendar?view=month&date=${format(refDate, "yyyy-MM-dd")}`}
            className={`rounded-md px-3 py-1 ${view === "month" ? "bg-[var(--color-primary)] text-white" : "border border-black/15"}`}
          >
            Monat
          </Link>
          <Link
            href={`/calendar?view=week&date=${format(refDate, "yyyy-MM-dd")}`}
            className={`rounded-md px-3 py-1 ${view === "week" ? "bg-[var(--color-primary)] text-white" : "border border-black/15"}`}
          >
            Woche
          </Link>
        </div>
      </div>

      {view === "month" ? (
        <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border border-black/10 bg-black/10">
          {["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].map((d) => (
            <div key={d} className="bg-black/5 px-2 py-1 text-center text-xs font-semibold text-black/60">
              {d}
            </div>
          ))}
          {days.map((day) => {
            const dayAppointments = appointments.filter((a) => isSameDay(a.startsAt, day));
            return (
              <div key={day.toISOString()} className={`min-h-[100px] bg-white p-1.5 ${!isSameMonth(day, refDate) ? "opacity-40" : ""}`}>
                <div className="mb-1 text-xs font-medium text-black/50">{format(day, "d")}</div>
                <div className="flex flex-col gap-0.5">
                  {dayAppointments.map((a) => (
                    <div key={a.id} className="group rounded bg-[var(--color-bg)] px-1 py-0.5 text-[11px]">
                      <div className="font-medium">{format(a.startsAt, "HH:mm")} {a.title}</div>
                      {a.case && <div className="text-black/50">{a.case.client.lastName}</div>}
                      <DeleteAppointmentButton id={a.id} />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {days.map((day) => {
            const dayAppointments = appointments.filter((a) => isSameDay(a.startsAt, day));
            return (
              <div key={day.toISOString()} className="rounded-lg border border-black/10 bg-white p-4">
                <h3 className="mb-2 text-sm font-semibold text-[var(--color-text)]">{format(day, "EEEE, dd.MM.yyyy", { locale: de })}</h3>
                {dayAppointments.length === 0 && <p className="text-sm text-black/40">Keine Termine.</p>}
                <ul className="flex flex-col gap-2">
                  {dayAppointments.map((a) => (
                    <li key={a.id} className="flex items-center justify-between rounded-md bg-[var(--color-bg)] px-3 py-2 text-sm">
                      <div>
                        <span className="font-medium">
                          {format(a.startsAt, "HH:mm")}–{format(a.endsAt, "HH:mm")} {a.title}
                        </span>
                        {a.case && <div className="text-black/50">{a.case.client.lastName}, {a.case.client.firstName}</div>}
                        {a.location && <div className="text-black/50">📍 {a.location}</div>}
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
