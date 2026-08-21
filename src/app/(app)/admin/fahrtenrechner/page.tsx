import { prisma } from "@/lib/prisma";
import { requireAdminOrVerwaltung } from "@/lib/rbac";
import { getSettings } from "@/lib/settings";
import {
  employeeReferencePoint,
  estimatedDriveMinutesBetween,
  weeklyDriveMinutes,
  nichtAbrechenbareFahrstundenWoche,
  type StandortKey,
} from "@/lib/fahrtenrechner/calc";
import { getEmployeeCapacity } from "@/lib/capacity";
import { employeeColor } from "@/lib/fahrtenrechner/employee-colors";
import { FahrtenrechnerClient } from "./fahrtenrechner-client";
import type { EmployeeVM, CaseVM } from "./types";

export default async function FahrtenrechnerPage() {
  await requireAdminOrVerwaltung();
  const settings = await getSettings();
  const billableCapacityFactor = settings.billableCapacityFactor.toNumber();
  const durchschnittKmh = settings.fahrtenrechnerDurchschnittskmh.toNumber();

  const [employees, cases] = await Promise.all([
    // Nur Fachkräfte (+ Admin, falls er selbst Fälle übernimmt) - Verwaltung bearbeitet keine Fälle
    // und darf hier nicht als möglicher Fallübernehmer erscheinen.
    prisma.user.findMany({ where: { active: true, role: { in: ["EMPLOYEE", "ADMIN"] } }, orderBy: { name: "asc" } }),
    prisma.case.findMany({
      where: { archived: false, status: "ACTIVE" },
      include: { client: true },
    }),
  ]);

  const employeeVMs: EmployeeVM[] = employees.map((employee, index) => {
    const referencePoint = employeeReferencePoint({
      wohnortLat: employee.wohnortLat?.toNumber() ?? null,
      wohnortLng: employee.wohnortLng?.toNumber() ?? null,
      primaerStandort: employee.primaerStandort as StandortKey,
    });

    const ownCases = cases.filter((c) => c.assignedEmployeeId === employee.id);

    const caseVMs: CaseVM[] = ownCases
      .filter((c) => c.client.lat != null && c.client.lng != null)
      .map((c) => {
        const clientLat = c.client.lat!.toNumber();
        const clientLng = c.client.lng!.toNumber();
        const fahrzeitMinEinzel = estimatedDriveMinutesBetween(referencePoint, { lat: clientLat, lng: clientLng }, durchschnittKmh);
        return {
          id: c.id,
          clientName: `${c.client.lastName}, ${c.client.firstName}`,
          lat: clientLat,
          lng: clientLng,
          besucheProWoche: c.besucheProWoche,
          geplanteFlsStdWoche: c.geplanteFlsStdWoche?.toNumber() ?? null,
          fahrzeitMinEinzel,
          // Hin- und Rückweg × Besuche/Woche
          fahrzeitWocheMinFall: weeklyDriveMinutes(fahrzeitMinEinzel, c.besucheProWoche),
        };
      });
    const caseCountMissingGeo = ownCases.length - caseVMs.length;

    const fahrzeitWocheMin = caseVMs.reduce((sum, c) => sum + c.fahrzeitWocheMinFall, 0);
    const zugeteilteFlsStdWoche = ownCases.reduce((sum, c) => sum + (c.geplanteFlsStdWoche?.toNumber() ?? 0), 0);
    const zielFlsStdWoche = employee.zielFlsStdWocheManuell?.toNumber() ?? getEmployeeCapacity(employee, billableCapacityFactor);

    return {
      id: employee.id,
      name: employee.name,
      color: employeeColor(index),
      referencePoint,
      hasWohnort: employee.wohnortLat != null && employee.wohnortLng != null,
      primaerStandort: employee.primaerStandort as StandortKey,
      einsatzradiusKm: employee.einsatzradiusKm.toNumber(),
      zielFlsStdWoche,
      zugeteilteFlsStdWoche,
      freieFlsStdWoche: zielFlsStdWoche - zugeteilteFlsStdWoche,
      fahrzeitWocheMin,
      nichtAbrechenbareFahrstundenWoche: nichtAbrechenbareFahrstundenWoche(fahrzeitWocheMin),
      cases: caseVMs,
      caseCountMissingGeo,
    };
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-[var(--color-text)]">Fahrten-/Fallrechner</h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          Geografische Übersicht aller aktiven Fälle und Kapazitäten – für die Zuteilungsentscheidung bei neuen Fällen.
        </p>
      </div>
      <FahrtenrechnerClient employees={employeeVMs} durchschnittKmh={durchschnittKmh} />
    </div>
  );
}
