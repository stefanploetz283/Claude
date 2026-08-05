import { requireAdmin } from "@/lib/rbac";
import { getSettings } from "@/lib/settings";
import { prisma } from "@/lib/prisma";
import { SettingsForm } from "./settings-form";
import { BetriebsferienPanel } from "./betriebsferien-panel";

export default async function AdminSettingsPage() {
  await requireAdmin();
  const settings = await getSettings();
  const periods = await prisma.betriebsferienPeriod.findMany({ orderBy: { startDate: "desc" } });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-[var(--color-text)]">Einstellungen</h1>
        <p className="mt-1 text-sm text-black/60">Praxisdaten, Design und Systemverhalten.</p>
      </div>
      <SettingsForm settings={settings} />
      <BetriebsferienPanel
        periods={periods.map((p) => ({ id: p.id, label: p.label, startDate: p.startDate.toISOString(), endDate: p.endDate.toISOString() }))}
      />
    </div>
  );
}
