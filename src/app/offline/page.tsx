import { ProsCard } from "@/components/pros/pros-card";
import { IconWifiOff } from "@/components/pros/pros-icons";
import { buttonPrimaryCls } from "@/app/(app)/cases/case-ui";

export default function OfflinePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--color-bg)] px-6 py-10">
      <ProsCard className="flex w-full max-w-md flex-col items-center gap-4 p-10 text-center">
        <span className="grid h-16 w-16 place-items-center rounded-full bg-[var(--pros-sage-pale)] text-[var(--color-primary)]">
          <IconWifiOff size={30} />
        </span>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-primary)]">Keine Verbindung</h1>
        <p className="max-w-sm text-sm leading-relaxed text-[var(--color-text-muted)]">
          Diese Seite braucht gerade eine Internetverbindung. Bereits diktierte, noch nicht synchronisierte Einträge werden automatisch
          übertragen, sobald wieder Netz verfügbar ist.
        </p>
        <a href="/heute" className={`${buttonPrimaryCls} mt-2 inline-flex min-h-11 items-center`}>
          Erneut versuchen
        </a>
      </ProsCard>
    </main>
  );
}
