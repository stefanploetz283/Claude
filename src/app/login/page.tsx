import { getSettings } from "@/lib/settings";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const settings = await getSettings();

  return (
    <div
      className="flex min-h-screen items-center justify-center px-4"
      style={
        {
          "--color-primary": settings.colorPrimary,
          "--color-bg": settings.colorAccentLight,
          "--color-text": settings.colorTextDark,
          background: "var(--color-bg)",
        } as React.CSSProperties
      }
    >
      <div className="w-full max-w-sm rounded-xl border border-black/10 bg-white p-8 shadow-sm">
        <div className="mb-6 flex flex-col items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={settings.logoUrl ? "/api/settings/logo" : "/logo.svg"} alt={settings.practiceName} className="h-24 w-auto object-contain" />
          <p className="text-sm text-black/60">Bitte melden Sie sich an</p>
        </div>

        <LoginForm />
      </div>
    </div>
  );
}
