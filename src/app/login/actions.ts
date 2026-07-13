"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { generateTotpSecret } from "@/lib/totp";
import { setPendingAuthCookie, readPendingAuthCookie, clearPendingAuthCookie } from "@/lib/pending-auth";
import { signIn } from "@/lib/auth";

export type ActionState = { error?: string } | undefined;

export async function startLogin(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const email = String(formData.get("email") ?? "").toLowerCase().trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Bitte E-Mail und Passwort eingeben." };
  }

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !user.active) {
    await prisma.accessLog.create({
      data: { action: "LOGIN_FAILED", entityType: "User", details: `Unbekannte E-Mail: ${email}` },
    });
    return { error: "E-Mail oder Passwort ist falsch." };
  }

  const validPassword = await verifyPassword(password, user.passwordHash);
  if (!validPassword) {
    await prisma.accessLog.create({
      data: { userId: user.id, action: "LOGIN_FAILED", entityType: "User", entityId: user.id },
    });
    return { error: "E-Mail oder Passwort ist falsch." };
  }

  if (!user.totpEnabled && !user.totpSecretPending) {
    const secret = generateTotpSecret();
    await prisma.user.update({ where: { id: user.id }, data: { totpSecretPending: secret } });
  }

  await setPendingAuthCookie(email, password);
  redirect("/login/verify");
}

export async function verifyLogin(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const code = String(formData.get("code") ?? "").trim();
  const pending = await readPendingAuthCookie();

  if (!pending) {
    return { error: "Sitzung abgelaufen. Bitte erneut anmelden." };
  }

  if (!code) {
    return { error: "Bitte den 6-stelligen Code eingeben." };
  }

  const result = await signIn("credentials", {
    email: pending.email,
    password: pending.password,
    code,
    redirect: false,
  });

  if (!result || result.error) {
    return { error: "Ungültiger Code. Bitte erneut versuchen." };
  }

  await clearPendingAuthCookie();
  redirect("/dashboard");
}

export async function cancelLogin() {
  await clearPendingAuthCookie();
  redirect("/login");
}
