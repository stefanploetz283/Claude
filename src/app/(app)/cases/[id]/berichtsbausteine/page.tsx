import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser, canAccessCase } from "@/lib/rbac";
import { logAccess } from "@/lib/access-log";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { CaseTabs } from "../case-tabs";
import { BerichtsbausteinCapture } from "./berichtsbaustein-capture";
import { BERICHTS_KAPITEL_INFO } from "@/lib/berichtsbausteine/manual";

const cardCls = "rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-soft)]";

export default async function BerichtsbausteinePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: caseId } = await params;
  const user = await requireUser();

  const caseRecord = await prisma.case.findUnique({
    where: { id: caseId },
    include: { client: true },
  });
  if (!caseRecord) notFound();
  if (!canAccessCase(user, caseRecord)) notFound();

  await logAccess({ userId: user.id, action: "VIEW", entityType: "Berichtsbaustein", entityId: caseId });

  const bausteine = await prisma.berichtsbaustein.findMany({
    where: { caseId },
    include: { ersteller: true, bezugBaustein: true },
    orderBy: { erfassungszeitpunkt: "desc" },
  });

  const letzteBausteine = bausteine.slice(0, 20).map((b) => ({
    id: b.id,
    kurzbezeichnung: `${format(b.erfassungszeitpunkt, "dd.MM.yyyy", { locale: de })} - ${b.originaltext.slice(0, 60)}${b.originaltext.length > 60 ? "…" : ""}`,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-primary)]">
          Abschlussbericht-Bausteine - {caseRecord.client.lastName}, {caseRecord.client.firstName}
        </h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          Inhaltliche Bausteine für den späteren KI-gestützten Abschlussbericht - unabhängig von der regulären Leistungsdokumentation.
        </p>
      </div>

      <CaseTabs caseId={caseId} />

      <BerichtsbausteinCapture caseId={caseId} triadeOptionen={caseRecord.triade} letzteBausteine={letzteBausteine} />

      <div className="flex flex-col gap-3">
        {bausteine.map((b) => (
          <div key={b.id} className={cardCls}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--color-text-muted)]">
                <span>{format(b.erfassungszeitpunkt, "dd.MM.yyyy HH:mm", { locale: de })}</span>
                <span>· {b.ersteller.name}</span>
                {b.vorlaeufigeKategorie && (
                  <span className="rounded-full bg-[var(--color-primary-soft)] px-2.5 py-0.5 font-semibold text-[var(--color-primary)]">
                    {BERICHTS_KAPITEL_INFO[b.vorlaeufigeKategorie].label}
                  </span>
                )}
                {b.triadeZuordnung.map((t) => (
                  <span key={t} className="rounded-full bg-[var(--color-bg)] px-2.5 py-0.5 font-medium text-[var(--color-text)]">
                    {t}
                  </span>
                ))}
              </div>
            </div>
            <p className="mt-2 text-sm whitespace-pre-wrap text-[var(--color-text)]">{b.originaltext}</p>
            {b.bezugBaustein && (
              <p className="mt-2 text-xs text-[var(--color-text-muted)]">
                ↳ verknüpft mit {format(b.bezugBaustein.erfassungszeitpunkt, "dd.MM.yyyy", { locale: de })}
              </p>
            )}
          </div>
        ))}
        {bausteine.length === 0 && (
          <p className={`${cardCls} text-sm text-[var(--color-text-muted)]`}>Noch keine Bausteine erfasst.</p>
        )}
      </div>
    </div>
  );
}
