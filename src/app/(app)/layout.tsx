import { requireUser } from "@/lib/rbac";
import { getSettings } from "@/lib/settings";
import { prisma } from "@/lib/prisma";
import { Nav } from "@/components/nav";
import { IdleTimer } from "@/components/idle-timer";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const settings = await getSettings();

  const unreadCount = await prisma.messageRecipient.count({
    where: { recipientId: user.id, readAt: null },
  });

  return (
    <div
      className="flex min-h-screen flex-col"
      style={
        {
          "--color-primary": settings.colorPrimary,
          "--color-bg": settings.colorAccentLight,
          "--color-text": settings.colorTextDark,
        } as React.CSSProperties
      }
    >
      <Nav role={user.role} unreadCount={unreadCount} logoUrl={settings.logoUrl} practiceName={settings.practiceName} />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">{children}</main>
      <IdleTimer idleTimeoutMinutes={settings.sessionIdleTimeoutMinutes} />
    </div>
  );
}
