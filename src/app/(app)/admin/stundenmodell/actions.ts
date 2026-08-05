"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/rbac";
import { logAccess } from "@/lib/access-log";

export type ActionState = { error?: string; success?: string } | undefined;

export async function saveProfile(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();

  const employeeId = String(formData.get("employeeId") ?? "");
  const wochenstunden = Number(formData.get("wochenstunden") ?? "");
  const tageProWoche = Number(formData.get("tageProWoche") ?? "");
  const eintrittsdatumStr = String(formData.get("eintrittsdatum") ?? "").trim();

  if (!employeeId || !Number.isFinite(wochenstunden) || wochenstunden <= 0) {
    return { error: "Bitte gültige Wochenstunden angeben." };
  }
  if (tageProWoche !== 4 && tageProWoche !== 5) {
    return { error: "Tage/Woche muss 4 oder 5 sein." };
  }

  const employee = await prisma.user.findUnique({ where: { id: employeeId } });
  if (!employee) return { error: "Mitarbeiter nicht gefunden." };

  // Bestandsschutz-Snapshot: nur beim allerersten Speichern die aktuelle Fonds-Basis einfrieren.
  let fondsBasisAtHire = employee.fondsBasisAtHire;
  if (fondsBasisAtHire == null) {
    const settings = await prisma.settings.findUnique({ where: { id: "singleton" } });
    fondsBasisAtHire = settings?.aktuelleFondsBasis ?? null;
  }

  await prisma.user.update({
    where: { id: employeeId },
    data: {
      weeklyContractHours: wochenstunden,
      weeklyWorkDays: tageProWoche,
      hireDate: eintrittsdatumStr ? new Date(eintrittsdatumStr) : null,
      fondsBasisAtHire,
    },
  });

  await logAccess({ userId: admin.id, action: "UPDATE", entityType: "User", entityId: employeeId, details: "Stundenmodell-Profil gespeichert" });
  revalidatePath("/admin/stundenmodell");
  return { success: "Profil gespeichert." };
}

export async function createSondertagTyp(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();

  const name = String(formData.get("name") ?? "").trim();
  const datumStr = String(formData.get("datum") ?? "");
  const dauerStd = Number(formData.get("dauerStd") ?? "");
  const istEchterExtraTag = formData.get("istEchterExtraTag") === "on";

  if (!name || !datumStr) return { error: "Bitte Name und Datum angeben." };
  if (!Number.isFinite(dauerStd) || dauerStd <= 0) return { error: "Bitte eine gültige Dauer angeben." };

  await prisma.sondertagTyp.create({ data: { name, datum: new Date(datumStr), dauerStd, istEchterExtraTag } });
  await logAccess({ userId: admin.id, action: "CREATE", entityType: "SondertagTyp", details: `${name} ${datumStr}` });
  revalidatePath("/admin/stundenmodell");
  return { success: "Sondertag angelegt." };
}

export async function deleteSondertagTyp(id: string) {
  const admin = await requireAdmin();
  await prisma.sondertagTyp.delete({ where: { id } });
  await logAccess({ userId: admin.id, action: "DELETE", entityType: "SondertagTyp", entityId: id });
  revalidatePath("/admin/stundenmodell");
}

export type WochenplanEntry = { day: number; start: string; end: string };

export async function savePlan(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();

  const employeeId = String(formData.get("employeeId") ?? "");
  const gueltigAbStr = String(formData.get("gueltigAb") ?? "").trim();
  const wochenplanStr = String(formData.get("wochenplan") ?? "[]");
  const sondertagIds = formData.getAll("sondertagIds").map(String);

  if (!employeeId || !gueltigAbStr) return { error: "Bitte gültig ab-Datum angeben." };

  let wochenplan: WochenplanEntry[];
  try {
    wochenplan = JSON.parse(wochenplanStr);
  } catch {
    return { error: "Ungültiger Wochenplan." };
  }

  await prisma.mitarbeiterPlan.create({
    data: {
      employeeId,
      gueltigAb: new Date(gueltigAbStr),
      wochenplan,
      sondertage: { connect: sondertagIds.map((id) => ({ id })) },
    },
  });

  await logAccess({
    userId: admin.id,
    action: "CREATE",
    entityType: "MitarbeiterPlan",
    entityId: employeeId,
    details: `Gültig ab ${gueltigAbStr}`,
  });
  revalidatePath("/admin/stundenmodell");
  return { success: "Plan gespeichert (neue Version, gültig ab)." };
}
