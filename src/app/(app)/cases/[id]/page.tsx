import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser, canAccessCase } from "@/lib/rbac";
import { getRemainingHours } from "@/lib/case-helpers";
import { resolveClientAddress } from "@/lib/client-address";
import { logAccess } from "@/lib/access-log";
import { CaseTabs } from "./case-tabs";
import { StatusForm } from "./status-form";
import { ArchiveCaseButton } from "./archive-button";
import { DeleteCaseButton } from "./delete-button";
import { CapacityPlanningForm } from "./capacity-planning-form";
import { BesuchsorteEditor } from "./besuchsorte-editor";
import { AuthorityAddressForm } from "./authority-address-form";
import { StundensatzForm } from "./stundensatz-form";
import { TriadeFallfuehrendForm } from "./triade-fallfuehrend-form";
import { getSettings } from "@/lib/settings";
import { istInAuslaufphase } from "@/lib/capacity";
import { differenceInCalendarDays, addMonths, format } from "date-fns";
import { de } from "date-fns/locale";
import { ProsCard, ProsSectionCard } from "@/components/pros/pros-card";
import { ProsStatusPill } from "@/components/pros/pros-status-pill";
import { ProsProgress } from "@/components/pros/pros-progress";
import { groupPillCls } from "../case-ui";
import { IconWarnTriangle } from "../case-icons";

const STATUS_LABELS: Record<string, string> = { ACTIVE: "Aktiv", PAUSED: "Pausiert", COMPLETED: "Abgeschlossen" };
const STATUS_TONE: Record<string, "active" | "attention" | "stable"> = {
  ACTIVE: "active",
  PAUSED: "attention",
  COMPLETED: "stable",
};

export default async function CaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();

  const caseRecord = await prisma.case.findUnique({
    where: { id },
    include: {
      client: true,
      besuchsorte: { orderBy: { sortOrder: "asc" } },
      helpType: true,
      assignedEmployee: true,
      substituteEmployee: true,
      fallfuehrendeFachkraft: true,
      statusHistory: { include: { changedBy: true }, orderBy: { changedAt: "desc" } },
    },
  });

  if (!caseRecord) notFound();
  if (!canAccessCase(user, caseRecord)) notFound();

  await logAccess({ userId: user.id, action: "VIEW", entityType: "Case", entityId: caseRecord.id });

  const { contingent, usedHours, remainingHours, remainingPercent } = await getRemainingHours(
    caseRecord.id,
    caseRecord.hoursContingent
  );

  const [serviceEntryCount, terminCount, documentCount, messageCount, timeEntryCount] = await Promise.all([
    prisma.serviceEntry.count({ where: { caseId: id } }),
    prisma.termin.count({ where: { caseId: id } }),
    prisma.document.count({ where: { caseId: id } }),
    prisma.message.count({ where: { caseId: id } }),
    prisma.timeEntry.count({ where: { caseId: id } }),
  ]);
  const relatedEntryCount = serviceEntryCount + terminCount + documentCount + messageCount + timeEntryCount;

  const contingentDeadline = caseRecord.contingentPeriodMonths
    ? addMonths(caseRecord.startDate, caseRecord.contingentPeriodMonths)
    : null;

  const now = new Date();
  const deadlineWarnings: { label: string; date: Date }[] = [];
  if (caseRecord.helpPlanMeetingDate) {
    const days = differenceInCalendarDays(caseRecord.helpPlanMeetingDate, now);
    if (days <= caseRecord.reminderLeadDays) deadlineWarnings.push({ label: "Hilfeplangespräch", date: caseRecord.helpPlanMeetingDate });
  }
  if (caseRecord.extensionDeadline) {
    const days = differenceInCalendarDays(caseRecord.extensionDeadline, now);
    if (days <= caseRecord.reminderLeadDays) deadlineWarnings.push({ label: "Verlängerungsantrag fällig", date: caseRecord.extensionDeadline });
  }

  const clientAddress = resolveClientAddress(caseRecord.client);
  const settings = user.role === "ADMIN" ? await getSettings() : null;
  const employees = await prisma.user.findMany({ where: { active: true }, orderBy: { name: "asc" } });

  // Proaktiver Hinweis (KI-gestütztes Abschlussberichtswesen, Phase 4): sobald der Fall in seine
  // Auslaufphase eintritt, aber nur solange die Vollständigkeitsprüfung/Generierung noch nicht
  // begonnen wurde - kein Zwang, daher kein erneuter Hinweis, sobald bereits ein Entwurf existiert.
  const bestehenderBerichtsentwurf = await prisma.abschlussberichtEntwurf.findUnique({ where: { caseId: id }, select: { id: true } });
  const zeigeAuslaufphasenHinweis = istInAuslaufphase(caseRecord, now) && !bestehenderBerichtsentwurf;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/dashboard" className="mb-3 inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-primary)]">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Zurück zu allen Fällen
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-primary)]">
            {caseRecord.client.lastName}, {caseRecord.client.firstName}
          </h1>
          <ProsStatusPill tone={STATUS_TONE[caseRecord.status]}>{STATUS_LABELS[caseRecord.status]}</ProsStatusPill>
        </div>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          {caseRecord.helpType.name} · {caseRecord.authority}
        </p>
      </div>

      <CaseTabs caseId={caseRecord.id} />

      {deadlineWarnings.length > 0 && (
        <div className="flex flex-col gap-1.5 rounded-[var(--pros-r-md)] bg-[var(--pros-status-attention-bg)] p-4 text-sm text-[var(--pros-status-attention-text)]">
          {deadlineWarnings.map((w) => (
            <div key={w.label} className="flex items-center gap-2">
              <IconWarnTriangle />
              {w.label}: {format(w.date, "dd.MM.yyyy", { locale: de })}
            </div>
          ))}
        </div>
      )}

      {zeigeAuslaufphasenHinweis && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--pros-r-md)] bg-[var(--pros-sage-pale)] p-4 text-sm text-[var(--color-primary)]">
          <span>Dieser Fall nähert sich dem Ende - Vollständigkeitsprüfung der Berichtsbausteine jetzt starten?</span>
          <Link
            href={`/cases/${caseRecord.id}/berichtsbausteine`}
            className="shrink-0 rounded-[var(--pros-r-sm)] bg-[var(--color-primary)] px-3.5 py-1.5 text-xs font-semibold text-white transition-[transform] duration-[170ms] ease-[var(--pros-ease)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.97]"
          >
            Zum Abschlussbericht
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <ProsCard className="p-5">
          <h2 className="mb-3 text-sm font-semibold text-[var(--color-text)]">Klient</h2>
          <dl className="flex flex-col gap-2 text-sm">
            <Row label="Geburtsdatum" value={caseRecord.client.birthDate ? format(caseRecord.client.birthDate, "dd.MM.yyyy") : "–"} />
            <Row label="Straße" value={clientAddress.street ?? "–"} />
            <Row label="PLZ / Ort" value={clientAddress.postalCodeCity ?? "–"} />
            <Row label="Kontakt" value={caseRecord.client.contactInfo ?? "–"} />
          </dl>
        </ProsCard>

        <ProsCard className="p-5">
          <h2 className="mb-3 text-sm font-semibold text-[var(--color-text)]">Zuständigkeit</h2>
          <dl className="flex flex-col gap-2 text-sm">
            <Row label="Zuständiger Mitarbeiter" value={caseRecord.assignedEmployee.name} />
            <Row label="Vertretung" value={caseRecord.substituteEmployee?.name ?? "Keine"} />
            <Row label="Startdatum" value={format(caseRecord.startDate, "dd.MM.yyyy")} />
            <Row label="Status" value={STATUS_LABELS[caseRecord.status]} />
          </dl>
        </ProsCard>

        <ProsCard className="p-5">
          <h2 className="mb-3 text-sm font-semibold text-[var(--color-text)]">Kapazität</h2>
          <dl className="flex flex-col gap-2 text-sm">
            <Row label="Bewilligtes Kontingent" value={`${contingent.toFixed(1)} Std.`} />
            {caseRecord.contingentPeriodMonths && (
              <Row label="Zeitraum" value={`${caseRecord.contingentPeriodMonths} Monate`} />
            )}
            <Row label="Dokumentiert" value={`${usedHours.toFixed(1)} Std.`} />
            <Row
              label="Verbleibend"
              value={
                <span className={remainingPercent <= 10 ? "font-semibold text-[var(--pros-status-critical-text)]" : "text-[var(--color-text)]"}>
                  {remainingHours.toFixed(1)} Std. ({remainingPercent.toFixed(0)} %)
                </span>
              }
            />
            {contingentDeadline && (
              <Row label="Aufzubrauchen bis" value={format(contingentDeadline, "dd.MM.yyyy")} />
            )}
          </dl>
          <div className="mt-3 flex items-center">
            <ProsProgress percent={contingent > 0 ? (usedHours / contingent) * 100 : 0} />
          </div>
        </ProsCard>
      </div>

      <ProsSectionCard title="Verwaltung & Konditionen">
        <div className="flex flex-col gap-5">
          <div>
            <span className={groupPillCls}>Kostenträger / Rechnungsadresse</span>
            <p className="mt-2 mb-3 text-sm text-[var(--color-text-muted)]">Wird auf der Rechnung als Empfängeradresse verwendet.</p>
            <AuthorityAddressForm
              caseId={caseRecord.id}
              authority={caseRecord.authority}
              authorityStreet={caseRecord.authorityStreet}
              authorityPostalCodeCity={caseRecord.authorityPostalCodeCity}
            />
          </div>

          {user.role === "ADMIN" && settings && (
            <div className="border-t border-[var(--pros-border-default)] pt-5">
              <span className={groupPillCls}>Stundensatz (Umsatz-Cockpit)</span>
              <p className="mt-2 mb-3 text-sm text-[var(--color-text-muted)]">
                Nicht jedes Jugendamt zahlt denselben Satz — ohne Eintrag gilt der praxisweite Basis-Stundensatz.
              </p>
              <StundensatzForm
                caseId={caseRecord.id}
                stundensatz={caseRecord.stundensatz?.toString() ?? ""}
                basisStundensatz={settings.hourlyRate?.toString() ?? "110"}
              />
            </div>
          )}
        </div>
      </ProsSectionCard>

      <ProsSectionCard title="Planung & Kapazität">
        <div className="flex flex-col gap-5">
          <div>
            <span className={groupPillCls}>Kapazitätsplanung</span>
            <p className="mt-2 mb-3 text-sm text-[var(--color-text-muted)]">
              Für die Kapazitäts-/Wartelisten-Ansicht im Verwaltungsbereich – unabhängig vom Stundenkontingent oben.
            </p>
            <CapacityPlanningForm caseId={caseRecord.id} expectedEndDate={caseRecord.expectedEndDate} phaseOutWeeks={caseRecord.phaseOutWeeks} />
          </div>

          <div className="border-t border-[var(--pros-border-default)] pt-5">
            <span className={groupPillCls}>Fahrten-/Fallrechner</span>
            <p className="mt-2 mb-3 text-sm text-[var(--color-text-muted)]">
              Besuchsorte (Zuhause, Schule, ...) und geplante Leistungszeit - Grundlage für den Fahrten-/Fallrechner (Admin-Tool).
            </p>
            <BesuchsorteEditor
              caseId={caseRecord.id}
              besuchsorte={caseRecord.besuchsorte.map((b) => ({
                id: b.id,
                bezeichnung: b.bezeichnung,
                adresse: b.adresse,
                besucheProMonat: b.besucheProMonat.toNumber(),
              }))}
              geplanteFlsStdWoche={caseRecord.geplanteFlsStdWoche?.toNumber() ?? null}
            />
          </div>
        </div>
      </ProsSectionCard>

      <ProsSectionCard title="Abschlussbericht-Konfiguration">
        <p className="mb-3 text-sm text-[var(--color-text-muted)]">
          Triade-Systeme und fallführende Fachkraft für das KI-gestützte Abschlussberichtswesen - die eigentlichen Bausteine werden im
          Reiter „Abschlussbericht&quot; erfasst.
        </p>
        <TriadeFallfuehrendForm
          caseId={caseRecord.id}
          triade={caseRecord.triade}
          fallfuehrendeFachkraftId={caseRecord.fallfuehrendeFachkraftId}
          employees={employees.map((e) => ({ id: e.id, name: e.name }))}
        />
      </ProsSectionCard>

      <ProsSectionCard title="Status & Verlauf">
        <div className="flex flex-col gap-5">
          <div>
            <span className={groupPillCls}>Status ändern</span>
            <div className="mt-2">
              <StatusForm caseId={caseRecord.id} currentStatus={caseRecord.status} />
            </div>
          </div>

          <div className="border-t border-[var(--pros-border-default)] pt-5">
            <span className={groupPillCls}>Verlauf</span>
            <ul className="mt-3 flex flex-col gap-4">
              {caseRecord.statusHistory.map((h) => (
                <li key={h.id} className="flex gap-3">
                  <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[var(--pros-status-active-text)]" />
                  <div>
                    <div className="text-[13.5px] font-semibold text-[var(--color-text)]">{STATUS_LABELS[h.newStatus]}</div>
                    <div className="mt-0.5 text-xs text-[var(--color-text-muted)]">
                      {format(h.changedAt, "dd.MM.yyyy HH:mm", { locale: de })} von {h.changedBy.name}
                    </div>
                    {h.reason && <div className="mt-0.5 text-xs text-[var(--color-text-muted)]">Grund: {h.reason}</div>}
                  </div>
                </li>
              ))}
              {caseRecord.statusHistory.length === 0 && <li className="text-sm text-[var(--color-text-muted)]">Noch keine Einträge.</li>}
            </ul>
          </div>
        </div>
      </ProsSectionCard>

      {user.role === "ADMIN" && (
        <ProsSectionCard title="Gefahrenzone">
          <div className="flex flex-col gap-5">
            <div>
              <span className={groupPillCls}>Fall archivieren</span>
              <p className="mt-2 mb-3 text-sm text-[var(--color-text-muted)]">
                Archivierte Fälle werden aus den aktiven Übersichten ausgeblendet, aber aus Aufbewahrungspflichten nicht gelöscht.
              </p>
              <ArchiveCaseButton caseId={caseRecord.id} />
            </div>

            <div className="border-t border-[var(--pros-border-default)] pt-5">
              <span className={groupPillCls}>Hilfe löschen</span>
              {relatedEntryCount > 0 ? (
                <p className="mt-2 text-sm text-[var(--color-text-muted)]">
                  Diese Hilfe kann nicht gelöscht werden, da bereits <strong>{relatedEntryCount}</strong> zugehörige Einträge vorhanden
                  sind (Leistungsdokumentation, Termine, Dokumente, Nachrichten oder Zeiterfassung). Nutzen Sie stattdessen „Fall
                  archivieren&quot;.
                </p>
              ) : (
                <>
                  <p className="mt-2 mb-3 text-sm text-[var(--color-text-muted)]">
                    Diese Hilfe hat noch keine zugehörigen Einträge und kann daher unwiderruflich gelöscht werden.
                  </p>
                  <DeleteCaseButton caseId={caseRecord.id} />
                </>
              )}
            </div>
          </div>
        </ProsSectionCard>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-[var(--color-text-muted)]">{label}</dt>
      <dd className="text-right text-[var(--color-text)]">{value}</dd>
    </div>
  );
}
