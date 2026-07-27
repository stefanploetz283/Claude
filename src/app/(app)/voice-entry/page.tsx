import { prisma } from "@/lib/prisma";
import { requireUser, caseVisibilityWhere } from "@/lib/rbac";
import { VoiceEntryFlow } from "./voice-entry-flow";

export default async function VoiceEntryPage() {
  const user = await requireUser();

  const cases = await prisma.case.findMany({
    where: { ...caseVisibilityWhere(user), status: { not: "COMPLETED" } },
    include: { client: true, helpType: true },
    orderBy: [{ client: { lastName: "asc" } }, { client: { firstName: "asc" } }],
  });

  const caseOptions = cases.map((c) => ({
    id: c.id,
    clientName: `${c.client.lastName}, ${c.client.firstName}`,
    helpTypeName: c.helpType.name,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-primary)]">Sprachdokumentation</h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          Diktiere eine Leistungsdokumentation. Klient, Datum, Uhrzeit und Inhalt werden automatisch erkannt und lassen sich vor dem
          Übernehmen noch bearbeiten.
        </p>
      </div>

      <VoiceEntryFlow caseOptions={caseOptions} />
    </div>
  );
}
