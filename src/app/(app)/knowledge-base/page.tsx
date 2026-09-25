import { format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/rbac";
import { getSettings } from "@/lib/settings";
import { ContributeForms } from "./contribute-forms";
import { ItemCard, type ItemCardData } from "./item-card";
import { ProsCard } from "@/components/pros/pros-card";
import { labelCls, filterFieldCls, buttonSecondaryCls, pageTitleCls, pageSubtitleCls } from "@/app/(app)/cases/case-ui";

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
        <h1 className={pageTitleCls}>Fachbox</h1>
        <p className={pageSubtitleCls}>
          Gemeinsame fachliche Wissensplattform des Teams – losgelöst von einzelnen Klientenfällen.
          {!canContribute && " Mitarbeiter haben aktuell nur Lesezugriff."}
        </p>
      </div>

      {canContribute && <ContributeForms />}

      <ProsCard className="p-4">
        <form method="get" className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1.5">
            <span className={labelCls}>Suche (Titel/Schlagwort)</span>
            <input name="q" defaultValue={params.q ?? ""} className={`w-72 max-w-full ${filterFieldCls}`} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={labelCls}>Ordner</span>
            <select name="folder" defaultValue={params.folder ?? ""} className={filterFieldCls}>
              <option value="">Alle</option>
              {folders.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className={buttonSecondaryCls}>
            Filtern
          </button>
        </form>
      </ProsCard>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <ItemCard key={item.id} item={item} />
        ))}
        {items.length === 0 && (
          <ProsCard className="col-span-full p-8 text-center text-sm text-[var(--color-text-muted)]">Keine Einträge gefunden.</ProsCard>
        )}
      </div>
    </div>
  );
}
