import Link from "next/link";
import { format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/rbac";
import { ProsCard } from "@/components/pros/pros-card";
import { ProsStatusPill } from "@/components/pros/pros-status-pill";
import { IconPlus } from "@/components/pros/pros-icons";
import { buttonPrimaryCls, pageTitleCls, tabBarCls, tabBaseCls, tabActiveCls, tabIdleCls } from "@/app/(app)/cases/case-ui";

// Zeilen-Link über die volle Kartenbreite: der Fokusring liegt innen, damit ihn overflow-hidden nicht abschneidet.
const rowLinkCls =
  "flex items-center justify-between gap-4 px-5 py-3.5 transition-colors duration-[170ms] ease-[var(--pros-ease)] focus-visible:[outline-offset:-3px]";

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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className={pageTitleCls}>Nachrichten</h1>
        <Link href="/messages/new" className={`${buttonPrimaryCls} inline-flex items-center gap-2`}>
          <IconPlus size={16} />
          Neue Nachricht
        </Link>
      </div>

      <nav aria-label="Nachrichten" className={tabBarCls}>
        <Link href="/messages?tab=inbox" aria-current={tab === "inbox" ? "page" : undefined} className={`${tabBaseCls} ${tab === "inbox" ? tabActiveCls : tabIdleCls}`}>
          Posteingang
        </Link>
        <Link href="/messages?tab=sent" aria-current={tab === "sent" ? "page" : undefined} className={`${tabBaseCls} ${tab === "sent" ? tabActiveCls : tabIdleCls}`}>
          Gesendet
        </Link>
      </nav>

      <ProsCard className="overflow-hidden">
        {tab === "inbox" ? (
          <ul>
            {inboxItems.map((item) => {
              const unread = !item.readAt;
              return (
                <li key={item.id} className="border-t border-[var(--pros-border-default)] first:border-t-0">
                  <Link
                    href={`/messages/${item.messageId}`}
                    className={`${rowLinkCls} ${unread ? "bg-[var(--pros-sage-pale)] hover:bg-[var(--pros-sage-soft)]/60" : "hover:bg-[var(--pros-sage-pale)]/60"}`}
                  >
                    <div className="min-w-0">
                      <p className={`text-sm text-[var(--color-text)] ${unread ? "font-semibold" : ""}`}>
                        {unread && <span className="sr-only">Ungelesen: </span>}
                        {item.message.subject}
                        {item.message.isBroadcast && <ProsStatusPill tone="stable" className="ml-2 align-middle">Rundschreiben</ProsStatusPill>}
                      </p>
                      <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
                        Von {item.message.sender.name}
                        {item.message.case && ` · Fall: ${item.message.case.client.lastName}, ${item.message.case.client.firstName}`}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-[var(--color-text-muted)] tabular-nums">{format(item.message.createdAt, "dd.MM.yyyy HH:mm")}</span>
                  </Link>
                </li>
              );
            })}
            {inboxItems.length === 0 && <li className="px-5 py-10 text-center text-sm text-[var(--color-text-muted)]">Keine Nachrichten.</li>}
          </ul>
        ) : (
          <ul>
            {sentItems.map((m) => (
              <li key={m.id} className="border-t border-[var(--pros-border-default)] first:border-t-0">
                <Link href={`/messages/${m.id}`} className={`${rowLinkCls} hover:bg-[var(--pros-sage-pale)]/60`}>
                  <div className="min-w-0">
                    <p className="text-sm text-[var(--color-text)]">
                      {m.subject}
                      {m.isBroadcast && <ProsStatusPill tone="stable" className="ml-2 align-middle">Rundschreiben</ProsStatusPill>}
                    </p>
                    <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
                      An {m.isBroadcast ? `${m.recipients.length} Mitarbeiter` : "1 Empfänger"}
                      {m.case && ` · Fall: ${m.case.client.lastName}, ${m.case.client.firstName}`}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-[var(--color-text-muted)] tabular-nums">{format(m.createdAt, "dd.MM.yyyy HH:mm")}</span>
                </Link>
              </li>
            ))}
            {sentItems.length === 0 && <li className="px-5 py-10 text-center text-sm text-[var(--color-text-muted)]">Keine gesendeten Nachrichten.</li>}
          </ul>
        )}
      </ProsCard>
    </div>
  );
}
