import Link from "next/link";
import { format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/rbac";

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const tab = params.tab === "sent" ? "sent" : "inbox";

  const inboxItems =
    tab === "inbox"
      ? await prisma.messageRecipient.findMany({
          where: { recipientId: user.id },
          include: { message: { include: { sender: true, case: { include: { client: true } } } } },
          orderBy: { message: { createdAt: "desc" } },
        })
      : [];

  const sentItems =
    tab === "sent"
      ? await prisma.message.findMany({
          where: { senderId: user.id },
          include: { case: { include: { client: true } }, recipients: true },
          orderBy: { createdAt: "desc" },
        })
      : [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-[var(--color-text)]">Nachrichten</h1>
        <Link href="/messages/new" className="rounded-md bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90">
          + Neue Nachricht
        </Link>
      </div>

      <div className="flex gap-1 text-sm">
        <Link href="/messages?tab=inbox" className={`rounded-md px-3 py-1 ${tab === "inbox" ? "bg-[var(--color-primary)] text-white" : "border border-black/15"}`}>
          Posteingang
        </Link>
        <Link href="/messages?tab=sent" className={`rounded-md px-3 py-1 ${tab === "sent" ? "bg-[var(--color-primary)] text-white" : "border border-black/15"}`}>
          Gesendet
        </Link>
      </div>

      <div className="overflow-hidden rounded-lg border border-black/10 bg-white">
        {tab === "inbox" ? (
          <ul>
            {inboxItems.map((item) => (
              <li key={item.id} className="border-b border-black/5 last:border-0">
                <Link href={`/messages/${item.messageId}`} className={`flex items-center justify-between gap-4 px-4 py-3 hover:bg-black/[0.02] ${!item.readAt ? "bg-[var(--color-bg)]" : ""}`}>
                  <div>
                    <p className={!item.readAt ? "font-semibold" : ""}>
                      {item.message.subject}
                      {item.message.isBroadcast && <span className="ml-2 rounded-full bg-black/10 px-2 py-0.5 text-[10px] font-normal">Rundschreiben</span>}
                    </p>
                    <p className="text-xs text-black/50">
                      Von {item.message.sender.name}
                      {item.message.case && ` · Fall: ${item.message.case.client.lastName}, ${item.message.case.client.firstName}`}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-black/40">{format(item.message.createdAt, "dd.MM.yyyy HH:mm")}</span>
                </Link>
              </li>
            ))}
            {inboxItems.length === 0 && <li className="px-4 py-8 text-center text-black/40">Keine Nachrichten.</li>}
          </ul>
        ) : (
          <ul>
            {sentItems.map((m) => (
              <li key={m.id} className="border-b border-black/5 last:border-0">
                <Link href={`/messages/${m.id}`} className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-black/[0.02]">
                  <div>
                    <p>
                      {m.subject}
                      {m.isBroadcast && <span className="ml-2 rounded-full bg-black/10 px-2 py-0.5 text-[10px]">Rundschreiben</span>}
                    </p>
                    <p className="text-xs text-black/50">
                      An {m.isBroadcast ? `${m.recipients.length} Mitarbeiter` : "1 Empfänger"}
                      {m.case && ` · Fall: ${m.case.client.lastName}, ${m.case.client.firstName}`}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-black/40">{format(m.createdAt, "dd.MM.yyyy HH:mm")}</span>
                </Link>
              </li>
            ))}
            {sentItems.length === 0 && <li className="px-4 py-8 text-center text-black/40">Keine gesendeten Nachrichten.</li>}
          </ul>
        )}
      </div>
    </div>
  );
}
