// Service Worker für die Fallverwaltung-PWA.
//
// Bewusst zurückhaltende Cache-Strategie: Diese App zeigt sensible fachliche Daten (Kinder-/Jugend-
// hilfe). Es werden NUR inhaltsadressierte, nutzerdatenfreie statische Assets (Next.js-Build-Dateien,
// App-Icons) gecacht. Seitenaufrufe (Navigationen) und alle API-/Server-Action-Anfragen gehen immer
// live ans Netz - bei Netzwerkfehler wird lediglich eine statische, datenfreie Offline-Seite gezeigt.
// So bleibt niemals eine alte Version einer Fall-/Klientenseite im Cache liegen.

const STATIC_CACHE = "fallverwaltung-static-v1";
const OFFLINE_URL = "/offline";

const PRECACHE_URLS = [OFFLINE_URL, "/icons/icon-192.png", "/icons/icon-512.png", "/favicon.ico"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== STATIC_CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return; // POST/Server Actions: nie cachen, immer live ausliefern

  const url = new URL(request.url);

  // Gehashte Next.js-Build-Dateien und App-Icons: enthalten keine Nutzerdaten, sicher cache-first.
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            const clone = response.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, clone));
            return response;
          })
      )
    );
    return;
  }

  // Seitenaufrufe: immer live vom Server (können sensible Daten enthalten) - nur bei Netzwerkfehler
  // die statische Offline-Seite zeigen, niemals eine gecachte Fall-/Klientenseite.
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL)));
    return;
  }

  // Alles andere (API-Routen, Server Actions, sonstige Daten) bewusst unangetastet lassen.
});
