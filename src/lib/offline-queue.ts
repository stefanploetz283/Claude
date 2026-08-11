// IndexedDB-Warteschlange für offline diktierte Einträge, die noch nicht verarbeitet werden konnten.
//
// Bewusst IndexedDB statt Cache Storage: Cache Storage ist für HTTP-Antworten gedacht (URL-basiert,
// kein gezieltes Löschen einzelner Einträge). Hier brauchen wir strukturierte Datensätze mit klarer
// Lebensdauer - ein Eintrag existiert nur, bis er erfolgreich synchronisiert wurde, und wird danach
// SOFORT gelöscht (kein dauerhaftes Liegenbleiben sensibler Bemerkungstexte im Browser-Speicher).
// Echte Verschlüsselung bietet auch IndexedDB nicht - der Schutz beruht auf Browser-Sandbox +
// Geräteverschlüsselung des Betriebssystems sowie der kurzen Verweildauer bis zur Synchronisierung.

const DB_NAME = "fallverwaltung-offline";
const DB_VERSION = 1;
const STORE_NAME = "pendingDictations";

export type PendingDictationMode = "zeit" | "leistung";

export type PendingDictation = {
  id: string;
  mode: PendingDictationMode;
  transcript: string;
  createdAt: string;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function queueDictation(mode: PendingDictationMode, transcript: string): Promise<PendingDictation> {
  const db = await openDb();
  const entry: PendingDictation = { id: crypto.randomUUID(), mode, transcript, createdAt: new Date().toISOString() };
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).add(entry);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
  return entry;
}

export async function getPendingDictations(): Promise<PendingDictation[]> {
  const db = await openDb();
  const result = await new Promise<PendingDictation[]>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = () => resolve(req.result as PendingDictation[]);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return result;
}

export async function removePendingDictation(id: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}
