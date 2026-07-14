"use client";

import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";

const ACTIVITY_EVENTS = ["mousemove", "mousedown", "keydown", "touchstart", "scroll"] as const;
const WARNING_BEFORE_MS = 60_000; // 1 Minute Warnung vor Abmeldung

export function IdleTimer({ idleTimeoutMinutes }: { idleTimeoutMinutes: number }) {
  const idleTimeoutMs = idleTimeoutMinutes * 60_000;
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    const warnTimer = { current: null as ReturnType<typeof setTimeout> | null };
    const logoutTimer = { current: null as ReturnType<typeof setTimeout> | null };

    function scheduleTimers() {
      if (warnTimer.current) clearTimeout(warnTimer.current);
      if (logoutTimer.current) clearTimeout(logoutTimer.current);
      warnTimer.current = setTimeout(() => setShowWarning(true), Math.max(idleTimeoutMs - WARNING_BEFORE_MS, 0));
      logoutTimer.current = setTimeout(() => {
        signOut({ callbackUrl: "/login" });
      }, idleTimeoutMs);
    }

    function handleActivity() {
      setShowWarning(false);
      scheduleTimers();
    }

    scheduleTimers();
    ACTIVITY_EVENTS.forEach((event) => window.addEventListener(event, handleActivity));
    return () => {
      ACTIVITY_EVENTS.forEach((event) => window.removeEventListener(event, handleActivity));
      if (warnTimer.current) clearTimeout(warnTimer.current);
      if (logoutTimer.current) clearTimeout(logoutTimer.current);
    };
  }, [idleTimeoutMs]);

  if (!showWarning) return null;

  return (
    <div className="fixed inset-x-0 bottom-4 z-50 mx-auto w-fit rounded-lg bg-[var(--color-warn)] px-4 py-3 text-sm text-white shadow-lg">
      Sie werden aufgrund von Inaktivität in Kürze abgemeldet. Bewegen Sie die Maus, um angemeldet zu bleiben.
    </div>
  );
}
