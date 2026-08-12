import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import type { Session } from "next-auth";

export async function requireUser(): Promise<Session["user"]> {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return session.user;
}

export async function requireAdmin(): Promise<Session["user"]> {
  const user = await requireUser();
  if (user.role !== "ADMIN") redirect("/dashboard");
  return user;
}

/** Admin oder Verwaltung - für Rechnungsstellung, Stundensatz, Fallanfragen. Fachkraft hat hier keinen Zugriff. */
export async function requireAdminOrVerwaltung(): Promise<Session["user"]> {
  const user = await requireUser();
  if (user.role !== "ADMIN" && user.role !== "VERWALTUNG") redirect("/dashboard");
  return user;
}

/**
 * Zugriffsschutz für den Interimsmodus (Übergangslösung bis zur Praxiseröffnung 1.11.) - separat
 * benannt, damit der gesamte Interim-Code (src/lib/interim/, src/app/(app)/interim/) inkl. dieser
 * Funktion später isoliert entfernt werden kann. Aktuell inhaltlich identisch zu requireAdmin.
 */
export async function requireInterimAdmin(): Promise<Session["user"]> {
  const user = await requireUser();
  if (user.role !== "ADMIN") redirect("/dashboard");
  return user;
}

/**
 * Prisma-Where-Klausel für fachliche Falldokumentation: Mitarbeiter sehen nur eigene/vertretene Fälle,
 * Admin sieht alle. Verwaltung sieht hier bewusst NICHTS - sie sieht Fälle nur über den separaten,
 * auf Abrechnungsdaten reduzierten Rechnungsbereich (kein Zugriff auf Bemerkungstexte/Dokumentation).
 */
export function caseVisibilityWhere(user: Session["user"]) {
  if (user.role === "ADMIN") return {};
  if (user.role === "VERWALTUNG") return { id: { in: [] as string[] } };
  return {
    OR: [{ assignedEmployeeId: user.id }, { substituteEmployeeId: user.id }],
  };
}

export function canAccessCase(
  user: Session["user"],
  caseRecord: { assignedEmployeeId: string; substituteEmployeeId: string | null }
) {
  if (user.role === "ADMIN") return true;
  if (user.role === "VERWALTUNG") return false;
  return caseRecord.assignedEmployeeId === user.id || caseRecord.substituteEmployeeId === user.id;
}
