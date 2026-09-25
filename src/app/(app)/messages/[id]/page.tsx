import { notFound } from "next/navigation";
import { format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { requireUser, caseVisibilityWhere } from "@/lib/rbac";
import { ComposeForm } from "../compose-form";
import { ProsCard } from "@/components/pros/pros-card";
import { ProsStatusPill } from "@/components/pros/pros-status-pill";
import { pageTitleCls } from "@/app/(app)/cases/case-ui";

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

  const senderInitial = message.sender.name.trim().charAt(0).toUpperCase() || "?";

  return (
    <div className="flex flex-col gap-6">
      <ProsCard className="p-6">
        <div className="flex items-start gap-4">
          <span
            aria-hidden="true"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[var(--pros-sage-soft)] text-sm font-bold text-[var(--color-primary)]"
          >
            {senderInitial}
          </span>
          <div className="min-w-0 flex-1">
            <h1 className={`${pageTitleCls} break-words`}>
              {message.subject}
              {message.isBroadcast && <ProsStatusPill tone="stable" className="ml-3 align-middle">Rundschreiben</ProsStatusPill>}
            </h1>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">
              Von {message.sender.name} · {format(message.createdAt, "dd.MM.yyyy HH:mm")}
              {message.case && ` · Fall: ${message.case.client.lastName}, ${message.case.client.firstName} (${message.case.helpType.name})`}
            </p>
            <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">An: {message.recipients.map((r) => r.recipient.name).join(", ")}</p>
          </div>
        </div>
        <div className="mt-5 border-t border-[var(--pros-border-default)] pt-5">
          <p className="max-w-[75ch] whitespace-pre-wrap text-[15px] leading-relaxed text-[var(--color-text)]">{message.body}</p>
        </div>
      </ProsCard>

      {!isSender && (
        <div>
          <h2 className="mb-3 text-[19px] leading-[1.2] font-bold tracking-[-0.015em] text-[var(--color-text)]">Antworten</h2>
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
