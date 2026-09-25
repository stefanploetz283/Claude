import { requireAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { NewHelpTypeForm, ArchiveHelpTypeButton } from "./help-type-controls";
import { ActivityProfilePanel } from "./activity-profile-panel";
import { BerichtsManualPanel } from "./berichtsmanual-panel";
import { ProsStatusPill } from "@/components/pros/pros-status-pill";
import { pageTitleCls, pageSubtitleCls, tableWrapCls, theadCls, trCls } from "@/app/(app)/cases/case-ui";

export default async function HelpTypesPage() {
  await requireAdmin();
  const helpTypes = await prisma.helpType.findMany({
    orderBy: { name: "asc" },
    include: {
      activityProfiles: { orderBy: { sortOrder: "asc" } },
      berichtsManualVersionen: { orderBy: { createdAt: "desc" }, include: { erstelltVon: true } },
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className={pageTitleCls}>Angebotskatalog</h1>
        <p className={pageSubtitleCls}>Hilfearten, die bei der Fallanlage zur Auswahl stehen.</p>
      </div>

      <NewHelpTypeForm />

      <div className={tableWrapCls}>
        <table className="w-full text-left text-sm">
          <thead className={theadCls}>
            <tr>
              <th scope="col" className="px-4 py-2.5">Bezeichnung</th>
              <th scope="col" className="px-4 py-2.5">Beschreibung</th>
              <th scope="col" className="px-4 py-2.5">Status</th>
              <th scope="col" className="px-4 py-2.5">Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {helpTypes.map((h) => (
              <tr key={h.id} className={trCls}>
                <td className="px-4 py-3 align-top font-semibold text-[var(--color-text)]">{h.name}</td>
                <td className="px-4 py-3 align-top text-[var(--color-text-muted)]">{h.description ?? "–"}</td>
                <td className="px-4 py-3 align-top">
                  <ProsStatusPill tone={h.archived ? "archived" : "active"}>{h.archived ? "Archiviert" : "Aktiv"}</ProsStatusPill>
                </td>
                <td className="px-4 py-3 align-top">
                  <div className="flex flex-col items-start gap-2.5">
                    <ArchiveHelpTypeButton id={h.id} archived={h.archived} />
                    <ActivityProfilePanel
                      helpTypeId={h.id}
                      defaultDurationWeeks={h.defaultDurationWeeks}
                      defaultTotalHoursMin={h.defaultTotalHoursMin?.toString() ?? null}
                      defaultTotalHoursMax={h.defaultTotalHoursMax?.toString() ?? null}
                      profiles={h.activityProfiles.map((p) => ({
                        id: p.id,
                        activityLabel: p.activityLabel,
                        hoursPerWeek: p.hoursPerWeek?.toString() ?? null,
                      }))}
                    />
                    <BerichtsManualPanel
                      helpTypeId={h.id}
                      versionen={h.berichtsManualVersionen.map((v) => ({
                        id: v.id,
                        text: v.text,
                        createdAt: v.createdAt.toISOString(),
                        erstelltVonName: v.erstelltVon.name,
                      }))}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
