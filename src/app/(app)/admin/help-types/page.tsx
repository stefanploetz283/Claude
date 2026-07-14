import { requireAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { NewHelpTypeForm, ArchiveHelpTypeButton } from "./help-type-controls";

export default async function HelpTypesPage() {
  await requireAdmin();
  const helpTypes = await prisma.helpType.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-[var(--color-text)]">Angebotskatalog</h1>
        <p className="mt-1 text-sm text-black/60">Hilfearten, die bei der Fallanlage zur Auswahl stehen.</p>
      </div>

      <NewHelpTypeForm />

      <div className="overflow-hidden rounded-lg border border-black/10 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-black/5 text-xs uppercase text-black/50">
            <tr>
              <th className="px-4 py-2">Bezeichnung</th>
              <th className="px-4 py-2">Beschreibung</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {helpTypes.map((h) => (
              <tr key={h.id} className="border-t border-black/5">
                <td className="px-4 py-2 font-medium">{h.name}</td>
                <td className="px-4 py-2 text-black/60">{h.description ?? "–"}</td>
                <td className="px-4 py-2">
                  <span className={h.archived ? "text-black/40" : "text-green-700"}>{h.archived ? "Archiviert" : "Aktiv"}</span>
                </td>
                <td className="px-4 py-2">
                  <ArchiveHelpTypeButton id={h.id} archived={h.archived} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
