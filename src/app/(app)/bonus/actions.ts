"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/rbac";
import { logAccess } from "@/lib/access-log";

export type ActionState = { error?: string } | undefined;

export async function selectGutschein(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  if (user.role === "VERWALTUNG") return { error: "Kein Zugriff." };

  const year = Number(formData.get("year") ?? 0);
  const month = Number(formData.get("month") ?? 0);
  const anbieter = String(formData.get("anbieter") ?? "");

  if (!year || !month) return { error: "Ungültiger Zeitraum." };
  if (!["EDEKA", "DM", "MEDIAMARKT"].includes(anbieter)) return { error: "Bitte einen Anbieter auswählen." };

  await prisma.gutscheinAuswahl.upsert({
    where: { employeeId_year_month: { employeeId: user.id, year, month } },
    update: { anbieter: anbieter as "EDEKA" | "DM" | "MEDIAMARKT" },
    create: { employeeId: user.id, year, month, anbieter: anbieter as "EDEKA" | "DM" | "MEDIAMARKT" },
  });

  await logAccess({
    userId: user.id,
    action: "UPDATE",
    entityType: "GutscheinAuswahl",
    details: `${anbieter} ${month}/${year}`,
  });
  revalidatePath("/bonus");
  revalidatePath("/admin/bonus");
}
