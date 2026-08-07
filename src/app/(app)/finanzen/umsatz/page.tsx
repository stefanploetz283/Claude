import { requireAdmin } from "@/lib/rbac";

export default async function UmsatzCockpitPage() {
  await requireAdmin();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-[var(--color-text)]">Umsatz-Cockpit</h1>
        <p className="mt-1 text-sm text-black/60">Laufende Umsatzhochrechnung fürs Team.</p>
      </div>
      <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-soft)]">
        <p className="text-sm text-[var(--color-text-muted)]">In Entwicklung – wird in einem separaten Auftrag spezifiziert.</p>
      </div>
    </div>
  );
}
