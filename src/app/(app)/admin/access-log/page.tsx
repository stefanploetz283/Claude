import { format } from "date-fns";
import { requireAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import type { AccessAction, Prisma } from "@prisma/client";
import { ProsCard } from "@/components/pros/pros-card";
import { ProsStatusPill } from "@/components/pros/pros-status-pill";
import { labelCls, filterFieldCls, buttonSecondaryCls, pageTitleCls, pageSubtitleCls, tableWrapCls, theadCls, trCls } from "@/app/(app)/cases/case-ui";

const ACTION_LABELS: Record<AccessAction, string> = {
  VIEW: "Angesehen",
  CREATE: "Erstellt",
  UPDATE: "Geändert",
  ARCHIVE: "Archiviert",
  DELETE: "Gelöscht",
  EXPORT: "Exportiert",
  LOGIN: "Login",
  LOGIN_FAILED: "Login fehlgeschlagen",
};

// Rein visuelle Zuordnung zur PROS-Statussprache: Auffälliges (fehlgeschlagener Login, Löschen) und
// Archiviertes heben sich ab, alle übrigen Aktionen bleiben neutral.
const ACTION_TONE: Record<AccessAction, "stable" | "attention" | "critical" | "archived"> = {
  VIEW: "stable",
  CREATE: "stable",
  UPDATE: "stable",
  ARCHIVE: "archived",
  DELETE: "attention",
  EXPORT: "stable",
  LOGIN: "stable",
  LOGIN_FAILED: "critical",
};

export default async function AccessLogPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireAdmin();
  const params = await searchParams;

  const [users, entityTypes] = await Promise.all([
    prisma.user.findMany({ orderBy: { name: "asc" } }),
    prisma.accessLog.findMany({ distinct: ["entityType"], select: { entityType: true } }),
  ]);

  const where: Prisma.AccessLogWhereInput = {};
  if (params.userId) where.userId = params.userId;
  if (params.action) where.action = params.action as AccessAction;
  if (params.entityType) where.entityType = params.entityType;

  const logs = await prisma.accessLog.findMany({
    where,
    include: { user: true },
    orderBy: { timestamp: "desc" },
    take: 300,
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className={pageTitleCls}>Zugriffsprotokoll</h1>
        <p className={pageSubtitleCls}>Wer hat wann welchen Fall/Datensatz eingesehen oder bearbeitet (letzte 300 Einträge).</p>
      </div>

      <ProsCard className="p-4">
        <form method="get" className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1.5">
            <span className={labelCls}>Mitarbeiter</span>
            <select name="userId" defaultValue={params.userId ?? ""} className={filterFieldCls}>
              <option value="">Alle</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={labelCls}>Aktion</span>
            <select name="action" defaultValue={params.action ?? ""} className={filterFieldCls}>
              <option value="">Alle</option>
              {Object.entries(ACTION_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={labelCls}>Datentyp</span>
            <select name="entityType" defaultValue={params.entityType ?? ""} className={filterFieldCls}>
              <option value="">Alle</option>
              {entityTypes.map((e) => (
                <option key={e.entityType} value={e.entityType}>
                  {e.entityType}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className={buttonSecondaryCls}>
            Filtern
          </button>
        </form>
      </ProsCard>

      <div className={tableWrapCls}>
        <table className="w-full text-left text-sm">
          <thead className={theadCls}>
            <tr>
              <th scope="col" className="px-4 py-2.5">Zeitpunkt</th>
              <th scope="col" className="px-4 py-2.5">Mitarbeiter</th>
              <th scope="col" className="px-4 py-2.5">Aktion</th>
              <th scope="col" className="px-4 py-2.5">Datentyp</th>
              <th scope="col" className="px-4 py-2.5">Details</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className={trCls}>
                <td className="px-4 py-2.5 whitespace-nowrap text-[var(--color-text)] tabular-nums">{format(log.timestamp, "dd.MM.yyyy HH:mm:ss")}</td>
                <td className="px-4 py-2.5 text-[var(--color-text)]">{log.user?.name ?? "Unbekannt"}</td>
                <td className="px-4 py-2.5">
                  <ProsStatusPill tone={ACTION_TONE[log.action]}>{ACTION_LABELS[log.action]}</ProsStatusPill>
                </td>
                <td className="px-4 py-2.5 text-[var(--color-text)]">{log.entityType}</td>
                <td className="px-4 py-2.5 text-[var(--color-text-muted)]">{log.details ?? "–"}</td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-[var(--color-text-muted)]">
                  Keine Einträge.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
