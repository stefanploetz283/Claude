"use client";

import { useEffect } from "react";

// Registrierung gilt für alle drei Rollen gleich - reine Infrastruktur, keine Berechtigungslogik.
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch((err) => {
      console.error("Service-Worker-Registrierung fehlgeschlagen:", err);
    });
  }, []);

  return null;
}
