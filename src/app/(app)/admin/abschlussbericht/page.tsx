import { requireAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { FachlicheKonzeptionForm } from "./fachliche-konzeption-form";
import { GlossarPanel } from "./glossar-panel";
import { ReferenzberichtePanel } from "./referenzberichte-panel";
import { ProsSectionCard } from "@/components/pros/pros-card";
import { pageTitleCls, pageSubtitleCls } from "@/app/(app)/cases/case-ui";

const sectionIntroCls = "mb-4 max-w-[75ch] text-sm leading-relaxed text-[var(--color-text-muted)]";

export default async function AbschlussberichtVerwaltungPage() {
  await requireAdmin();

  const [konzeption, glossar, referenzberichte, settings, freigegebeneAnzahl] = await Promise.all([
    prisma.praxisFachlicheKonzeption.upsert({ where: { id: "singleton" }, update: {}, create: { id: "singleton" } }),
    prisma.praxisGlossarBegriff.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.referenzbericht.findMany({ orderBy: { createdAt: "desc" }, include: { erstelltVon: true } }),
    getSettings(),
    prisma.referenzbericht.count({ where: { freigegeben: true } }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className={pageTitleCls}>Abschlussbericht - Verwaltung</h1>
        <p className={`${pageSubtitleCls} max-w-[75ch]`}>
          Fachliche Konzeption, Begriffsglossar und Referenzberichte-Bibliothek für das KI-gestützte Abschlussberichtswesen. Das
          versionierte Berichtsmanual wird je Hilfeart im Angebotskatalog gepflegt.
        </p>
      </div>

      <ProsSectionCard title="Fachliche Konzeption">
        <p className={sectionIntroCls}>Fließt bei jeder Berichtsgenerierung als fachlicher Rahmen ein.</p>
        <FachlicheKonzeptionForm text={konzeption.text} />
      </ProsSectionCard>

      <ProsSectionCard title="Begriffsglossar">
        <p className={sectionIntroCls}>
          Zentrale Fachbegriffe (PROS-Fachkonzept) - werden bei der Generierung verbindlich in dieser Bedeutung verwendet, nicht
          allgemeinsprachlich.
        </p>
        <GlossarPanel begriffe={glossar} />
      </ProsSectionCard>

      <ProsSectionCard title="Referenzberichte-Bibliothek">
        <p className={sectionIntroCls}>
          Nur freigegebene Berichte fließen in die Generierung ein - ausschließlich für Sprache/Stil/Tonalität, niemals für Inhalte.
        </p>
        <ReferenzberichtePanel
          berichte={referenzberichte.map((r) => ({
            id: r.id,
            titel: r.titel,
            text: r.text,
            freigegeben: r.freigegeben,
            erstelltVonName: r.erstelltVon.name,
            createdAt: r.createdAt.toISOString(),
          }))}
          freigegebeneAnzahl={freigegebeneAnzahl}
          maxAnzahl={settings.berichtReferenzberichteMaxAnzahl}
        />
      </ProsSectionCard>
    </div>
  );
}
