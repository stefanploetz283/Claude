import { requireUser } from "@/lib/rbac";
import { getSettings } from "@/lib/settings";
import { prisma } from "@/lib/prisma";
import { AppSidebar } from "@/components/app-sidebar";
import { AppBody } from "@/components/app-body";
import { IdleTimer } from "@/components/idle-timer";
import { GlobalDictateWidget } from "@/components/global-dictate/global-dictate-widget";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const settings = await getSettings();

  const [unreadCount, dbUser] = await Promise.all([
    prisma.messageRecipient.count({ where: { recipientId: user.id, readAt: null } }),
    prisma.user.findUnique({ where: { id: user.id }, select: { avatarUrl: true } }),
  ]);
  // Liegt jetzt auf Layout-Ebene statt nur auf /heute, weil das Profilbild (samt Upload) über den
  // App-weiten Sidebar-Profilbereich erreichbar ist, nicht mehr nur im Hero einer einzelnen Seite.
  const avatarSrc = dbUser?.avatarUrl ? `/api/users/${user.id}/avatar` : null;

  return (
    <div
      className="flex min-h-screen flex-col lg:flex-row"
      style={
        {
          "--color-primary": settings.colorPrimary,
          "--color-bg": settings.colorAccentLight,
          "--color-text": settings.colorTextDark,
        } as React.CSSProperties
      }
    >
      <AppSidebar
        role={user.role}
        unreadCount={unreadCount}
        logoUrl={settings.logoUrl ? "/api/settings/logo" : null}
        practiceName={settings.practiceName}
        userName={user.name ?? user.email ?? "?"}
        avatarUrl={avatarSrc}
      />
      <AppBody reserveFabSpace={user.role === "EMPLOYEE" || user.role === "ADMIN"}>{children}</AppBody>
      <IdleTimer idleTimeoutMinutes={settings.sessionIdleTimeoutMinutes} />
      {(user.role === "EMPLOYEE" || user.role === "ADMIN") && <GlobalDictateWidget />}
    </div>
  );
}
