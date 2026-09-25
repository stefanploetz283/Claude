import { requireAdmin } from "@/lib/rbac";
import { getSettings } from "@/lib/settings";
import { prisma } from "@/lib/prisma";
import { SettingsForm } from "./settings-form";
import { BetriebsferienPanel } from "./betriebsferien-panel";
import { pageTitleCls, pageSubtitleCls } from "@/app/(app)/cases/case-ui";

export default async function AdminSettingsPage() {
  await requireAdmin();
  const settings = await getSettings();
  const periods = await prisma.betriebsferienPeriod.findMany({ orderBy: { startDate: "desc" } });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className={pageTitleCls}>Einstellungen</h1>
        <p className={pageSubtitleCls}>Praxisdaten, Design und Systemverhalten.</p>
      </div>
      <SettingsForm settings={settings} />
      <BetriebsferienPanel
        periods={periods.map((p) => ({ id: p.id, label: p.label, startDate: p.startDate.toISOString(), endDate: p.endDate.toISOString() }))}
      />
    </div>
  );
}
