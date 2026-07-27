import { notFound } from "next/navigation";
import { format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { requireUser, caseVisibilityWhere } from "@/lib/rbac";
import { ComposeForm } from "../compose-form";

export default async function MessageDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();

  const message = await prisma.message.findUnique({
    where: { id },
    include: {
      sender: true,
      case: { include: { client: true, helpType: true } },
      recipients: { include: { recipient: true } },
    },
  });
  if (!message) notFound();

  const isSender = message.senderId === user.id;
  const myRecipientEntry = message.recipients.find((r) => r.recipientId === user.id);
  if (!isSender && !myRecipientEntry) notFound();

  if (myRecipientEntry && !myRecipientEntry.readAt) {
    await prisma.messageRecipient.update({ where: { id: myRecipientEntry.id }, data: { readAt: new Date() } });
  }

  const [employees, cases] = await Promise.all([
    prisma.user.findMany({ where: { active: true, id: { not: user.id } }, orderBy: { name: "asc" } }),
    prisma.case.findMany({ where: { archived: false, ...caseVisibilityWhere(user) }, include: { client: true, helpType: true }, orderBy: { updatedAt: "desc" } }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-lg border border-black/10 bg-white p-6">
        <div className="mb-3 flex items-start justify-between">
          <div>
            <h1 className="text-lg font-semibold text-[var(--color-text)]">
              {message.subject}
              {message.isBroadcast && <span className="ml-2 rounded-full bg-black/10 px-2 py-0.5 text-xs font-normal">Rundschreiben</span>}
            </h1>
            <p className="mt-1 text-sm text-black/50">
              Von {message.sender.name} · {format(message.createdAt, "dd.MM.yyyy HH:mm")}
              {message.case && ` · Fall: ${message.case.client.lastName}, ${message.case.client.firstName} (${message.case.helpType.name})`}
            </p>
            <p className="mt-1 text-xs text-black/40">
              An: {message.recipients.map((r) => r.recipient.name).join(", ")}
            </p>
          </div>
        </div>
        <p className="whitespace-pre-wrap text-sm text-[var(--color-text)]">{message.body}</p>
      </div>

      {!isSender && (
        <div>
          <h2 className="mb-3 text-sm font-semibold text-[var(--color-text)]">Antworten</h2>
          <ComposeForm
            employees={employees.map((e) => ({ id: e.id, name: e.name }))}
            cases={cases.map((c) => ({ id: c.id, label: `${c.client.lastName}, ${c.client.firstName} (${c.helpType.name})` }))}
            defaultRecipientId={message.senderId}
            defaultSubject={message.subject.startsWith("Re: ") ? message.subject : `Re: ${message.subject}`}
            defaultCaseId={message.caseId ?? undefined}
          />
        </div>
      )}
    </div>
  );
}
