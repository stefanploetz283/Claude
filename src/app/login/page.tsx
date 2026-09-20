import { getSettings } from "@/lib/settings";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const settings = await getSettings();

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
      <div className="relative hidden flex-none overflow-hidden bg-[var(--color-primary)] p-12 lg:flex lg:w-[45%] lg:items-center">
        <svg
          viewBox="0 0 620 760"
          preserveAspectRatio="xMidYMid slice"
          className="pointer-events-none absolute inset-0 h-full w-full"
          aria-hidden="true"
        >
          <g style={{ isolation: "isolate" }}>
            <circle cx="200" cy="560" r="300" fill="var(--color-sage)" style={{ mixBlendMode: "multiply" }} />
            <circle cx="470" cy="770" r="260" fill="var(--color-gold)" style={{ mixBlendMode: "multiply" }} />
          </g>
          <g fill="none" stroke="#ffffff" strokeWidth="1.5" opacity="0.6">
            <circle cx="200" cy="560" r="300" />
            <circle cx="470" cy="770" r="260" />
          </g>
        </svg>
        <div className="relative flex flex-col gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-wordmark-dark-bg.svg" alt="" className="h-14 w-auto" />
          <div className="leading-tight">
            <div className="text-sm font-semibold tracking-[0.18em] text-[var(--color-gold)] uppercase">Jugendhilfe</div>
            <div className="my-2.5 h-[1.5px] w-[180px] bg-[var(--color-gold)]" />
            <div className="text-[10px] font-semibold tracking-[0.12em] text-white">
              BERATUNG&nbsp;&nbsp;<span className="text-[var(--color-gold)]">•</span>&nbsp;&nbsp;PÄDAGOGIK&nbsp;&nbsp;
              <span className="text-[var(--color-gold)]">•</span>&nbsp;&nbsp;THERAPIE
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center bg-[var(--color-bg)] px-4 py-10">
        <div className="w-full max-w-[420px] rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-10 shadow-[0_16px_40px_rgba(32,77,75,.08)]">
          <div className="mb-7 flex flex-col items-center gap-3 lg:hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={settings.logoUrl ? "/api/settings/logo" : "/logo-lockup.png"}
              alt={settings.practiceName}
              className="h-16 w-auto object-contain"
            />
          </div>
          <h1 className="text-[26px] font-bold tracking-tight text-[var(--color-primary)]">Anmelden</h1>
          <p className="mt-2 mb-7 text-sm text-[var(--color-text-muted)]">Melden Sie sich mit Ihren Zugangsdaten an</p>

          <LoginForm />
        </div>
      </div>
    </div>
  );
}
