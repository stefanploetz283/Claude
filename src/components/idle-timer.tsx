"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { signOut } from "next-auth/react";

const ACTIVITY_EVENTS = ["mousemove", "mousedown", "keydown", "touchstart", "scroll"] as const;
const WARNING_BEFORE_MS = 60_000; // 1 Minute Warnung vor Abmeldung

export function IdleTimer({ idleTimeoutMinutes }: { idleTimeoutMinutes: number }) {
  const idleTimeoutMs = idleTimeoutMinutes * 60_000;
  const [showWarning, setShowWarning] = useState(false);
  const warnTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const logoutTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reset = useCallback(() => {
    setShowWarning(false);
    if (warnTimer.current) clearTimeout(warnTimer.current);
    if (logoutTimer.current) clearTimeout(logoutTimer.current);

    warnTimer.current = setTimeout(() => setShowWarning(true), Math.max(idleTimeoutMs - WARNING_BEFORE_MS, 0));
    logoutTimer.current = setTimeout(() => {
      signOut({ callbackUrl: "/login" });
    }, idleTimeoutMs);
  }, [idleTimeoutMs]);

  useEffect(() => {
    reset();
    ACTIVITY_EVENTS.forEach((event) => window.addEventListener(event, reset));
    return () => {
      ACTIVITY_EVENTS.forEach((event) => window.removeEventListener(event, reset));
      if (warnTimer.current) clearTimeout(warnTimer.current);
      if (logoutTimer.current) clearTimeout(logoutTimer.current);
    };
  }, [reset]);

  if (!showWarning) return null;

  return (
    <div className="fixed inset-x-0 bottom-4 z-50 mx-auto w-fit rounded-lg bg-[var(--color-warn)] px-4 py-3 text-sm text-white shadow-lg">
      Sie werden aufgrund von Inaktivität in Kürze abgemeldet. Bewegen Sie die Maus, um angemeldet zu bleiben.
    </div>
  );
}
