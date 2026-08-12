import { requireInterimAdmin } from "@/lib/rbac";
import { NewInterimCaseForm } from "./new-interim-case-form";

export default async function NewInterimCasePage() {
  await requireInterimAdmin();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-primary)]">Neuen Fall anlegen (Interimsmodus)</h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          Diese Daten werden bei jedem Export automatisch übernommen und müssen nur einmal erfasst werden.
        </p>
      </div>
      <NewInterimCaseForm />
    </div>
  );
}
