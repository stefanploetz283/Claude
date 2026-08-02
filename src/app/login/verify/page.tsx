import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { readPendingAuthCookie } from "@/lib/pending-auth";
import { totpQrCodeDataUrl } from "@/lib/totp";
import { getSettings } from "@/lib/settings";
import { VerifyForm } from "./verify-form";

export default async function VerifyPage() {
  const pending = await readPendingAuthCookie();
  if (!pending) redirect("/login");

  const user = await prisma.user.findUnique({ where: { email: pending.email } });
  if (!user) redirect("/login");
  const settings = await getSettings();

  let qrCode: string | null = null;
  if (!user.totpEnabled && user.totpSecretPending) {
    qrCode = await totpQrCodeDataUrl(user.email, user.totpSecretPending, settings.practiceName);
  }

  return (
    <div
      className="flex min-h-screen items-center justify-center bg-[var(--color-bg)] px-4"
      style={
        {
          "--color-primary": settings.colorPrimary,
          "--color-bg": settings.colorAccentLight,
          "--color-text": settings.colorTextDark,
        } as React.CSSProperties
      }
    >
      <div className="w-full max-w-sm rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8 shadow-[0_16px_40px_rgba(32,77,75,.08)]">
        <h1 className="mb-1 text-lg font-semibold text-[var(--color-primary)]">
          {qrCode ? "Zwei-Faktor-Authentifizierung einrichten" : "Zwei-Faktor-Code eingeben"}
        </h1>
        <p className="mb-6 text-sm text-[var(--color-text-muted)]">
          {qrCode
            ? "Scannen Sie den QR-Code mit einer Authenticator-App (z.B. Google Authenticator, Authy) und geben Sie den angezeigten Code ein, um die Einrichtung abzuschließen."
            : "Geben Sie den 6-stelligen Code aus Ihrer Authenticator-App ein."}
        </p>

        {qrCode && (
          <div className="mb-6 flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrCode} alt="QR-Code für 2FA-Einrichtung" className="h-40 w-40" />
          </div>
        )}

        <VerifyForm />
      </div>
    </div>
  );
}
