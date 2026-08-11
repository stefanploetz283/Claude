export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#F5F0E8] px-6 text-center">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#204D4B" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 9a16 16 0 0 1 22 0" opacity="0.3" />
        <path d="M5 12.5a11 11 0 0 1 14 0" opacity="0.5" />
        <path d="M8.5 16a6 6 0 0 1 7 0" opacity="0.7" />
        <line x1="12" y1="20" x2="12.01" y2="20" />
        <line x1="2" y1="2" x2="22" y2="22" />
      </svg>
      <h1 className="text-xl font-semibold text-[#204D4B]">Keine Verbindung</h1>
      <p className="max-w-sm text-sm text-[#5C635E]">
        Diese Seite braucht gerade eine Internetverbindung. Bereits diktierte, noch nicht synchronisierte Einträge werden automatisch
        übertragen, sobald wieder Netz verfügbar ist.
      </p>
      <a
        href="/dashboard"
        className="rounded-[9px] bg-[#204D4B] px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
      >
        Erneut versuchen
      </a>
    </div>
  );
}
