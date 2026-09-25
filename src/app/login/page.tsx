import { getSettings } from "@/lib/settings";
import { LoginForm } from "./login-form";
import { AuthShell } from "./auth-shell";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const settings = await getSettings();

  return (
    <AuthShell settings={settings}>
      <h1 className="font-display text-[38px] leading-[1.05] tracking-[-0.01em] text-[var(--color-primary)]">Anmelden</h1>
      <p className="mt-2 mb-8 text-sm text-[var(--color-text-muted)]">Melden Sie sich mit Ihren Zugangsdaten an</p>

      <LoginForm />
    </AuthShell>
  );
}
