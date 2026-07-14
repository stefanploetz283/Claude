"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/rbac";
import { hashPassword } from "@/lib/password";
import { generateTempPassword } from "@/lib/generate-password";
import { logAccess } from "@/lib/access-log";

export type ActionState = { error?: string; success?: string; tempPassword?: string } | undefined;

export async function createEmployee(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").toLowerCase().trim();
  const role = String(formData.get("role") ?? "EMPLOYEE") as "ADMIN" | "EMPLOYEE";

  if (!name || !email) {
    return { error: "Bitte Name und E-Mail angeben." };
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "Ein Benutzer mit dieser E-Mail existiert bereits." };
  }

  const tempPassword = generateTempPassword();
  const passwordHash = await hashPassword(tempPassword);

  const user = await prisma.user.create({
    data: { name, email, role, passwordHash },
  });

  await logAccess({ userId: admin.id, action: "CREATE", entityType: "User", entityId: user.id });
  revalidatePath("/admin/employees");

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
  revalidatePath("/admin/employees");
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
  revalidatePath("/admin/employees");
  return { tempPassword };
}
