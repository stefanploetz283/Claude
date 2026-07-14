import { requireAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { NewEmployeeForm } from "./new-employee-form";
import { EmployeeRowActions } from "./employee-row-actions";

export default async function EmployeesPage() {
  await requireAdmin();
  const employees = await prisma.user.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-[var(--color-text)]">Mitarbeiter</h1>
        <p className="mt-1 text-sm text-black/60">Benutzerkonten verwalten. Konten werden deaktiviert statt gelöscht.</p>
      </div>

      <NewEmployeeForm />

      <div className="overflow-hidden rounded-lg border border-black/10 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-black/5 text-xs uppercase text-black/50">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">E-Mail</th>
              <th className="px-4 py-2">Rolle</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">2FA</th>
              <th className="px-4 py-2">Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((e) => (
              <tr key={e.id} className="border-t border-black/5">
                <td className="px-4 py-2 font-medium">{e.name}</td>
                <td className="px-4 py-2">{e.email}</td>
                <td className="px-4 py-2">{e.role === "ADMIN" ? "Admin" : "Mitarbeiter"}</td>
                <td className="px-4 py-2">
                  <span className={e.active ? "text-green-700" : "text-black/40"}>{e.active ? "Aktiv" : "Deaktiviert"}</span>
                </td>
                <td className="px-4 py-2">{e.totpEnabled ? "Eingerichtet" : "Ausstehend"}</td>
                <td className="px-4 py-2">
                  <EmployeeRowActions id={e.id} active={e.active} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
