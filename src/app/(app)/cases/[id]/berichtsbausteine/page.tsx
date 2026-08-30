import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser, canAccessCase } from "@/lib/rbac";
import { logAccess } from "@/lib/access-log";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { CaseTabs } from "../case-tabs";
import { BerichtsbausteinCapture } from "./berichtsbaustein-capture";
import { EntwicklungsspurView, type BausteinAnsicht } from "./entwicklungsspur-view";
import { BerichtsentwurfPanel } from "./berichtsentwurf-panel";

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

  const entwurf = await prisma.abschlussberichtEntwurf.findUnique({ where: { caseId } });

  const bausteineAnsicht: BausteinAnsicht[] = bausteine.map((b) => ({
    id: b.id,
    erfassungszeitpunkt: b.erfassungszeitpunkt.toISOString(),
    originaltext: b.originaltext,
    erstellerName: b.ersteller.name,
    vorlaeufigeKategorie: b.vorlaeufigeKategorie,
    triadeZuordnung: b.triadeZuordnung,
    bezugDatum: b.bezugBaustein ? b.bezugBaustein.erfassungszeitpunkt.toISOString() : null,
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

      <EntwicklungsspurView bausteine={bausteineAnsicht} />

      <BerichtsentwurfPanel
        caseId={caseId}
        entwurf={
          entwurf
            ? {
                text: entwurf.text,
                status: entwurf.status,
                generiertAmLabel: format(entwurf.generiertAm, "dd.MM.yyyy HH:mm", { locale: de }),
                correctionNote: entwurf.correctionNote,
              }
            : null
        }
      />
    </div>
  );
}
