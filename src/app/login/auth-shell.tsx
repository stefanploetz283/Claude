import type { Settings } from "@prisma/client";

// Gemeinsame Hülle für /login und /login/verify - außerhalb des App-Shells, aber klar PROS: links die
// Petrol-Fläche der Sidebar (aus --color-primary abgeleitet, damit die Praxis-Farbe aus den Einstellungen
// weiter greift) mit Logo, Markenmotiv und dem Signatur-Slogan in Caveat; rechts die warme Formularfläche.
// Rein visuell - kein Auth-Verhalten.

const panelBackground: React.CSSProperties = {
  background:
    "radial-gradient(125% 40% at 0% 82%, rgba(138,161,135,.24), transparent 55%), " +
    "linear-gradient(180deg, color-mix(in srgb, var(--color-primary) 84%, white) 0%, var(--color-primary) 56%, color-mix(in srgb, var(--color-primary) 92%, black) 100%)",
};

export function AuthShell({
  settings,
  children,
}: {
  settings: Pick<Settings, "colorPrimary" | "colorAccentLight" | "colorTextDark" | "logoUrl" | "practiceName">;
  children: React.ReactNode;
}) {
  return (
    <div
      className="flex min-h-screen"
      style={
        {
          "--color-primary": settings.colorPrimary,
          "--color-bg": settings.colorAccentLight,
          "--color-text": settings.colorTextDark,
        } as React.CSSProperties
      }
    >
      <aside style={panelBackground} className="relative hidden flex-none flex-col gap-14 overflow-hidden p-12 lg:flex lg:w-[45%] xl:p-16">
        <svg viewBox="0 0 620 760" preserveAspectRatio="xMidYMid slice" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
          <g style={{ isolation: "isolate" }}>
            <circle cx="210" cy="700" r="270" fill="var(--color-sage)" style={{ mixBlendMode: "multiply" }} />
            <circle cx="480" cy="790" r="240" fill="var(--color-gold)" style={{ mixBlendMode: "multiply" }} />
          </g>
          <g fill="none" stroke="#ffffff" strokeWidth="1.5" opacity="0.6">
            <circle cx="210" cy="700" r="270" />
            <circle cx="480" cy="790" r="240" />
          </g>
        </svg>

        {/* Offizielles Negativ-Logo (public/brand) direkt auf der Petrol-Fläche; die viewBox der SVG ist auf
            die sichtbare Fläche getrimmt, das Logo sitzt dadurch ohne Margin-Korrektur bündig zum Slogan. */}
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/pros-logo-negative.svg" alt="PROS Jugendhilfe" className="h-auto w-[229px]" />
        </div>

        <p className="font-script relative -rotate-[4deg] text-[40px] leading-[0.95] text-white xl:text-[46px]">
          Menschen.
          <br />
          Wege.
          <br />
          Möglichkeiten.
          <span className="mt-3 block h-[3px] w-14 rounded-full bg-[var(--color-gold)]" />
        </p>
      </aside>

      <main className="flex flex-1 items-center justify-center bg-[var(--color-bg)] px-4 py-10">
        <div className="w-full max-w-[440px]">
          <div className="mb-7 flex flex-col items-center lg:hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={settings.logoUrl ? "/api/settings/logo" : "/brand/pros-logo-primary.svg"}
              alt={settings.practiceName}
              className="h-16 w-auto object-contain"
            />
          </div>
          <div className="rounded-[var(--pros-r-lg)] border border-[var(--pros-border-strong)] bg-[var(--color-surface)] p-8 shadow-[var(--pros-shadow)] sm:p-10">{children}</div>
        </div>
      </main>
    </div>
  );
}
