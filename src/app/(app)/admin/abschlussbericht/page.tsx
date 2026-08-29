import { requireAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { FachlicheKonzeptionForm } from "./fachliche-konzeption-form";
import { GlossarPanel } from "./glossar-panel";
import { ReferenzberichtePanel } from "./referenzberichte-panel";

const cardCls = "rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-soft)]";

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
        <h1 className="text-xl font-semibold text-[var(--color-text)]">Abschlussbericht - Verwaltung</h1>
        <p className="mt-1 text-sm text-black/60">
          Fachliche Konzeption, Begriffsglossar und Referenzberichte-Bibliothek für das KI-gestützte Abschlussberichtswesen. Das
          versionierte Berichtsmanual wird je Hilfeart im Angebotskatalog gepflegt.
        </p>
      </div>

      <div className={cardCls}>
        <h2 className="mb-1 text-sm font-semibold text-[var(--color-text)]">Fachliche Konzeption</h2>
        <p className="mb-3 text-sm text-[var(--color-text-muted)]">Fließt bei jeder Berichtsgenerierung als fachlicher Rahmen ein.</p>
        <FachlicheKonzeptionForm text={konzeption.text} />
      </div>

      <div className={cardCls}>
        <h2 className="mb-1 text-sm font-semibold text-[var(--color-text)]">Begriffsglossar</h2>
        <p className="mb-3 text-sm text-[var(--color-text-muted)]">
          Zentrale Fachbegriffe (PROS-Fachkonzept) - werden bei der Generierung verbindlich in dieser Bedeutung verwendet, nicht
          allgemeinsprachlich.
        </p>
        <GlossarPanel begriffe={glossar} />
      </div>

      <div className={cardCls}>
        <h2 className="mb-1 text-sm font-semibold text-[var(--color-text)]">Referenzberichte-Bibliothek</h2>
        <p className="mb-3 text-sm text-[var(--color-text-muted)]">
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
      </div>
    </div>
  );
}
