"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/rbac";
import { hashPassword } from "@/lib/password";
import { generateTempPassword } from "@/lib/generate-password";
import { logAccess } from "@/lib/access-log";

export type ActionState = { error?: string; success?: string; tempPassword?: string } | undefined;

// Neue Fachkräfte werden standardmäßig nur für diese Hilfeart freigegeben (Kapazitätsplanung).
const DEFAULT_ALLOWED_HELP_TYPE_NAME = "PROS Schule";

export async function createEmployee(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").toLowerCase().trim();
  const role = String(formData.get("role") ?? "EMPLOYEE") as "ADMIN" | "EMPLOYEE" | "VERWALTUNG";

  if (!name || !email) {
    return { error: "Bitte Name und E-Mail angeben." };
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "Ein Benutzer mit dieser E-Mail existiert bereits." };
  }

  const tempPassword = generateTempPassword();
  const passwordHash = await hashPassword(tempPassword);

  // Neue Fachkräfte werden zunächst nur für "PROS Schule" freigegeben (Kapazitätsplanung) - weitere
  // Hilfearten gibt der Admin danach manuell frei (Unterreiter "Vertrag & Stundenmodell").
  const defaultHelpType =
    role === "EMPLOYEE" ? await prisma.helpType.findUnique({ where: { name: DEFAULT_ALLOWED_HELP_TYPE_NAME } }) : null;

  const user = await prisma.user.create({
    data: {
      name,
      email,
      role,
      passwordHash,
      ...(defaultHelpType ? { allowedHelpTypes: { connect: { id: defaultHelpType.id } } } : {}),
    },
  });

  await logAccess({ userId: admin.id, action: "CREATE", entityType: "User", entityId: user.id });
  revalidatePath("/mitarbeiter");

  return { success: `Mitarbeiter ${name} wurde angelegt.`, tempPassword };
}

export async function setEmployeeActive(userId: string, active: boolean) {
  const admin = await requireAdmin();
  await prisma.user.update({ where: { id: userId }, data: { active } });
  await logAccess({
    userId: admin.id,
    action: "UPDATE",
    entityType: "User",
    entityId: userId,
    details: active ? "Reaktiviert" : "Deaktiviert (archiviert)",
  });
  revalidatePath("/mitarbeiter");
  revalidatePath(`/mitarbeiter/${userId}/stammdaten`);
}

export async function resetEmployeePassword(userId: string): Promise<{ tempPassword: string }> {
  const admin = await requireAdmin();
  const tempPassword = generateTempPassword();
  const passwordHash = await hashPassword(tempPassword);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash, totpEnabled: false, totpSecret: null, totpSecretPending: null },
  });
  await logAccess({ userId: admin.id, action: "UPDATE", entityType: "User", entityId: userId, details: "Passwort zurückgesetzt" });
  revalidatePath(`/mitarbeiter/${userId}/stammdaten`);
  return { tempPassword };
}

export async function saveStammdaten(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const userId = String(formData.get("userId") ?? "");
  const address = String(formData.get("address") ?? "").trim() || null;
  const birthdayStr = String(formData.get("birthday") ?? "").trim();
  const emergencyContact = String(formData.get("emergencyContact") ?? "").trim() || null;

  if (!userId) return { error: "Mitarbeiter nicht gefunden." };

  await prisma.user.update({
    where: { id: userId },
    data: { address, birthday: birthdayStr ? new Date(birthdayStr) : null, emergencyContact },
  });

  await logAccess({ userId: admin.id, action: "UPDATE", entityType: "User", entityId: userId, details: "Stammdaten geändert" });
  revalidatePath(`/mitarbeiter/${userId}/stammdaten`);
  return { success: "Stammdaten gespeichert." };
}
