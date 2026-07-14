import { requireAdmin } from "@/lib/rbac";
import { getSettings } from "@/lib/settings";
import { SettingsForm } from "./settings-form";

export default async function AdminSettingsPage() {
  await requireAdmin();
  const settings = await getSettings();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-[var(--color-text)]">Einstellungen</h1>
        <p className="mt-1 text-sm text-black/60">Praxisdaten, Design und Systemverhalten.</p>
      </div>
      <SettingsForm settings={settings} />
    </div>
  );
}
