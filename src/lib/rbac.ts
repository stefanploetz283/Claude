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

/** Prisma-Where-Klausel: Mitarbeiter sehen nur eigene/vertretene Fälle, Admin sieht alle. */
export function caseVisibilityWhere(user: Session["user"]) {
  if (user.role === "ADMIN") return {};
  return {
    OR: [{ assignedEmployeeId: user.id }, { substituteEmployeeId: user.id }],
  };
}
