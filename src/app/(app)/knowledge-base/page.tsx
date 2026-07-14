import { format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/rbac";
import { getSettings } from "@/lib/settings";
import { ContributeForms } from "./contribute-forms";
import { ItemCard, type ItemCardData } from "./item-card";

export default async function KnowledgeBasePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const settings = await getSettings();

  const canContribute = user.role === "ADMIN" || settings.employeesCanContributeKnowledge;

  const allItems = await prisma.knowledgeItem.findMany({
    where: { archived: false },
    include: { createdBy: true },
    orderBy: { createdAt: "desc" },
  });

  const q = params.q?.toLowerCase().trim();
  const folder = params.folder;

  const filtered = allItems.filter((item) => {
    if (folder && item.folder !== folder) return false;
    if (!q) return true;
    return item.title.toLowerCase().includes(q) || item.tags.some((t) => t.toLowerCase().includes(q));
  });

  const folders = Array.from(new Set(allItems.map((i) => i.folder).filter((f): f is string => !!f))).sort();

  const items: ItemCardData[] = filtered.map((item) => ({
    id: item.id,
    title: item.title,
    type: item.type,
    description: item.description,
    url: item.url,
    folder: item.folder,
    tags: item.tags,
    createdByName: item.createdBy.name,
    createdAt: format(item.createdAt, "dd.MM.yyyy"),
    canDelete: user.role === "ADMIN" || item.createdById === user.id,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-[var(--color-text)]">Fachbox</h1>
        <p className="mt-1 text-sm text-black/60">
          Gemeinsame fachliche Wissensplattform des Teams – losgelöst von einzelnen Klientenfällen.
          {!canContribute && " Mitarbeiter haben aktuell nur Lesezugriff."}
        </p>
      </div>

      {canContribute && <ContributeForms />}

      <form method="get" className="flex flex-wrap items-end gap-3 rounded-lg border border-black/10 bg-white p-4">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-black/60">Suche (Titel/Schlagwort)</span>
          <input name="q" defaultValue={params.q ?? ""} className="w-64 rounded-md border border-black/15 px-3 py-1.5 text-sm" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-black/60">Ordner</span>
          <select name="folder" defaultValue={params.folder ?? ""} className="rounded-md border border-black/15 px-3 py-1.5 text-sm">
            <option value="">Alle</option>
            {folders.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="rounded-md border border-black/15 px-4 py-1.5 text-sm hover:bg-black/5">
          Filtern
        </button>
      </form>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <ItemCard key={item.id} item={item} />
        ))}
        {items.length === 0 && <p className="text-black/40">Keine Einträge gefunden.</p>}
      </div>
    </div>
  );
}
