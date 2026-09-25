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
    // Petrol auf Gold (5,6:1) statt Weiß auf Gold (2,1:1) - siehe Kontrastmatrix in design/PROS-DESIGN-SYSTEM.md 4.1.
    // z-[60]: über dem Diktat-FAB (z-50), unter Modals (z-[70]). role="alert" kündigt die Warnung Screenreadern an.
    <div
      role="alert"
      className="pros-modal-panel fixed inset-x-4 bottom-4 z-[60] mx-auto w-fit max-w-[32rem] rounded-[var(--pros-r-md)] bg-[var(--color-gold)] px-5 py-3.5 text-sm font-semibold text-[var(--color-primary)] shadow-[var(--pros-shadow-popover)]"
    >
      Sie werden aufgrund von Inaktivität in Kürze abgemeldet. Bewegen Sie die Maus, um angemeldet zu bleiben.
    </div>
  );
}
