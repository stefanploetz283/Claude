import { requireUser } from "@/lib/rbac";

export default async function DashboardPage() {
  const user = await requireUser();
  return (
    <div>
      <h1 className="text-xl font-semibold text-[var(--color-text)]">Willkommen, {user.name}</h1>
      <p className="mt-2 text-sm text-black/60">Rolle: {user.role}</p>
    </div>
  );
}
