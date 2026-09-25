import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { readPendingAuthCookie } from "@/lib/pending-auth";
import { totpQrCodeDataUrl } from "@/lib/totp";
import { getSettings } from "@/lib/settings";
import { VerifyForm } from "./verify-form";
import { AuthShell } from "../auth-shell";

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
    <AuthShell settings={settings}>
      <h1 className="font-display text-[32px] leading-[1.1] tracking-[-0.01em] text-[var(--color-primary)]">
        {qrCode ? "Zwei-Faktor-Authentifizierung einrichten" : "Zwei-Faktor-Code eingeben"}
      </h1>
      <p className="mt-3 mb-7 text-sm leading-relaxed text-[var(--color-text-muted)]">
        {qrCode
          ? "Scannen Sie den QR-Code mit einer Authenticator-App (z.B. Google Authenticator, Authy) und geben Sie den angezeigten Code ein, um die Einrichtung abzuschließen."
          : "Geben Sie den 6-stelligen Code aus Ihrer Authenticator-App ein."}
      </p>

      {qrCode && (
        <div className="mb-7 flex justify-center">
          {/* Weiße Trägerfläche bleibt: QR-Codes brauchen maximalen Kontrast, um zuverlässig scanbar zu sein. */}
          <div className="rounded-[var(--pros-r-md)] border border-[var(--pros-border-strong)] bg-white p-3 shadow-[var(--pros-shadow)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrCode} alt="QR-Code für 2FA-Einrichtung" className="h-40 w-40" />
          </div>
        </div>
      )}

      <VerifyForm />
    </AuthShell>
  );
}
