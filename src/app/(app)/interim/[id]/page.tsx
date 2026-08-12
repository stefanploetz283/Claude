import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { requireInterimAdmin } from "@/lib/rbac";
import { InterimDictateWidget } from "./interim-dictate-widget";
import { InterimEntriesList } from "./interim-entries-list";
import { ExportControls } from "./export-controls";
import { CaseDetailsCard } from "./case-details-card";

const ANGEBOTSART_LABELS: Record<string, string> = {
  ERZIEHUNGSBEISTANDSCHAFT: "Erziehungsbeistandschaft",
  PROS: "PROS",
};

const cardCls = "rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-soft)]";

export default async function InterimCaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireInterimAdmin();
  const { id } = await params;

  const interimCase = await prisma.interimCase.findUnique({ where: { id } });
  if (!interimCase) notFound();

  const entries = await prisma.interimEntry.findMany({
    where: { caseId: id },
    orderBy: { date: "desc" },
  });

  const entryRows = entries.map((e) => ({
    id: e.id,
    date: format(e.date, "dd.MM.yyyy"),
    timeLabel: `${format(e.startTime, "HH:mm")} – ${format(e.endTime, "HH:mm")}`,
    content: e.content,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/interim" className="mb-3 inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-[var(--color-text-muted)] transition hover:text-[var(--color-primary)]">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Zurück zur Fallübersicht (Interim)
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-primary)]">
            {interimCase.familienname}, {interimCase.vorname}
          </h1>
          <span className="rounded-full bg-[var(--color-primary-soft)] px-3 py-1 text-xs font-semibold text-[var(--color-primary)]">
            {ANGEBOTSART_LABELS[interimCase.angebotsart]}
          </span>
        </div>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          {interimCase.strasseHausnummer} · {interimCase.plzOrt}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <CaseDetailsCard
          data={{
            id: interimCase.id,
            angebotsart: interimCase.angebotsart,
            familienname: interimCase.familienname,
            vorname: interimCase.vorname,
            strasseHausnummer: interimCase.strasseHausnummer,
            plzOrt: interimCase.plzOrt,
            sachbearbeiterSpfd: interimCase.sachbearbeiterSpfd,
            bewilligteWochenstunden: interimCase.bewilligteWochenstunden.toString(),
            honorarProStunde: interimCase.honorarProStunde.toString(),
            leistungserbringer: interimCase.leistungserbringer,
            createdAt: interimCase.createdAt,
          }}
        />

        <div className={`${cardCls} lg:col-span-2`}>
          <h2 className="mb-1 text-sm font-semibold text-[var(--color-text)]">Als Monatsabrechnung exportieren</h2>
          <p className="mb-3 text-sm text-[var(--color-text-muted)]">
            Titel im Dokument wird automatisch anhand der Angebotsart gesetzt.
          </p>
          <ExportControls caseId={interimCase.id} />
        </div>
      </div>

      <InterimDictateWidget caseId={interimCase.id} />

      <div>
        <h2 className="mb-3 text-lg font-semibold text-[var(--color-text)]">Einträge</h2>
        <div className="overflow-x-auto rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-soft)]">
          <InterimEntriesList caseId={interimCase.id} entries={entryRows} />
        </div>
      </div>
    </div>
  );
}
