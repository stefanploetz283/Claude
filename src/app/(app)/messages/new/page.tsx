import { prisma } from "@/lib/prisma";
import { requireUser, caseVisibilityWhere } from "@/lib/rbac";
import { ComposeForm } from "../compose-form";

export default async function NewMessagePage() {
  const user = await requireUser();

  const [employees, cases] = await Promise.all([
    prisma.user.findMany({ where: { active: true, id: { not: user.id } }, orderBy: { name: "asc" } }),
    prisma.case.findMany({ where: { archived: false, ...caseVisibilityWhere(user) }, include: { client: true }, orderBy: { updatedAt: "desc" } }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-[var(--color-text)]">Neue Nachricht</h1>
      </div>
      <ComposeForm
        employees={employees.map((e) => ({ id: e.id, name: e.name }))}
        cases={cases.map((c) => ({ id: c.id, label: `${c.client.lastName}, ${c.client.firstName} (${c.caseNumber})` }))}
      />
    </div>
  );
}
