import { format } from "date-fns";
import { requireAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import type { AccessAction, Prisma } from "@prisma/client";

const ACTION_LABELS: Record<AccessAction, string> = {
  VIEW: "Angesehen",
  CREATE: "Erstellt",
  UPDATE: "Geändert",
  ARCHIVE: "Archiviert",
  EXPORT: "Exportiert",
  LOGIN: "Login",
  LOGIN_FAILED: "Login fehlgeschlagen",
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
        <h1 className="text-xl font-semibold text-[var(--color-text)]">Zugriffsprotokoll</h1>
        <p className="mt-1 text-sm text-black/60">Wer hat wann welchen Fall/Datensatz eingesehen oder bearbeitet (letzte 300 Einträge).</p>
      </div>

      <form method="get" className="flex flex-wrap items-end gap-3 rounded-lg border border-black/10 bg-white p-4">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-black/60">Mitarbeiter</span>
          <select name="userId" defaultValue={params.userId ?? ""} className="rounded-md border border-black/15 px-3 py-1.5 text-sm">
            <option value="">Alle</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-black/60">Aktion</span>
          <select name="action" defaultValue={params.action ?? ""} className="rounded-md border border-black/15 px-3 py-1.5 text-sm">
            <option value="">Alle</option>
            {Object.entries(ACTION_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-black/60">Datentyp</span>
          <select name="entityType" defaultValue={params.entityType ?? ""} className="rounded-md border border-black/15 px-3 py-1.5 text-sm">
            <option value="">Alle</option>
            {entityTypes.map((e) => (
              <option key={e.entityType} value={e.entityType}>
                {e.entityType}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="rounded-md border border-black/15 px-4 py-1.5 text-sm hover:bg-black/5">
          Filtern
        </button>
      </form>

      <div className="overflow-x-auto rounded-lg border border-black/10 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-black/5 text-xs uppercase text-black/50">
            <tr>
              <th className="px-4 py-2">Zeitpunkt</th>
              <th className="px-4 py-2">Mitarbeiter</th>
              <th className="px-4 py-2">Aktion</th>
              <th className="px-4 py-2">Datentyp</th>
              <th className="px-4 py-2">Details</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="border-t border-black/5">
                <td className="px-4 py-2 whitespace-nowrap">{format(log.timestamp, "dd.MM.yyyy HH:mm:ss")}</td>
                <td className="px-4 py-2">{log.user?.name ?? "Unbekannt"}</td>
                <td className="px-4 py-2">{ACTION_LABELS[log.action]}</td>
                <td className="px-4 py-2">{log.entityType}</td>
                <td className="px-4 py-2 text-black/60">{log.details ?? "–"}</td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-black/40">
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
