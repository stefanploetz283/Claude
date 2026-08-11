import { requireUser } from "@/lib/rbac";
import { getSettings } from "@/lib/settings";
import { prisma } from "@/lib/prisma";
import { Nav } from "@/components/nav";
import { AppBody } from "@/components/app-body";
import { IdleTimer } from "@/components/idle-timer";
import { GlobalDictateWidget } from "@/components/global-dictate/global-dictate-widget";

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
      <Nav
        role={user.role}
        unreadCount={unreadCount}
        logoUrl={settings.logoUrl ? "/api/settings/logo" : null}
        practiceName={settings.practiceName}
        userName={user.name ?? user.email ?? "?"}
      />
      <AppBody role={user.role}>{children}</AppBody>
      <IdleTimer idleTimeoutMinutes={settings.sessionIdleTimeoutMinutes} />
      {(user.role === "EMPLOYEE" || user.role === "ADMIN") && <GlobalDictateWidget />}
    </div>
  );
}
