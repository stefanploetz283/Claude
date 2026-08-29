"use client";

import { useState } from "react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { BERICHTS_KAPITEL_ORDER, BERICHTS_KAPITEL_INFO, DUENN_BESETZT_SCHWELLE } from "@/lib/berichtsbausteine/manual";
import type { BerichtsKapitel } from "@prisma/client";

export type BausteinAnsicht = {
  id: string;
  erfassungszeitpunkt: string; // ISO
  originaltext: string;
  erstellerName: string;
  vorlaeufigeKategorie: BerichtsKapitel | null;
  triadeZuordnung: string[];
  bezugDatum: string | null; // ISO, falls verknüpft
};

const cardCls = "rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-soft)]";

export function EntwicklungsspurView({ bausteine }: { bausteine: BausteinAnsicht[] }) {
  const [ansicht, setAnsicht] = useState<"chronologisch" | "kapitel">("chronologisch");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-1 self-start rounded-[var(--radius-control)] bg-[var(--color-bg)] p-1 text-sm">
        <button
          onClick={() => setAnsicht("chronologisch")}
          className={`rounded-[calc(var(--radius-control)-2px)] px-3.5 py-1.5 font-medium transition ${
            ansicht === "chronologisch" ? "bg-[var(--color-surface)] text-[var(--color-primary)] shadow-[var(--shadow-soft)]" : "text-[var(--color-text-muted)]"
          }`}
        >
          Chronologisch
        </button>
        <button
          onClick={() => setAnsicht("kapitel")}
          className={`rounded-[calc(var(--radius-control)-2px)] px-3.5 py-1.5 font-medium transition ${
            ansicht === "kapitel" ? "bg-[var(--color-surface)] text-[var(--color-primary)] shadow-[var(--shadow-soft)]" : "text-[var(--color-text-muted)]"
          }`}
        >
          Nach Kapitel gruppiert
        </button>
      </div>

      {ansicht === "chronologisch" ? <ChronologischeAnsicht bausteine={bausteine} /> : <KapitelBoard bausteine={bausteine} />}
    </div>
  );
}

function ChronologischeAnsicht({ bausteine }: { bausteine: BausteinAnsicht[] }) {
  return (
    <div className="flex flex-col gap-3">
      {bausteine.map((b) => (
        <div key={b.id} className={cardCls}>
          <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--color-text-muted)]">
            <span>{format(new Date(b.erfassungszeitpunkt), "dd.MM.yyyy HH:mm", { locale: de })}</span>
            <span>· {b.erstellerName}</span>
            {b.vorlaeufigeKategorie && <Badge kapitel={b.vorlaeufigeKategorie} />}
            {b.triadeZuordnung.map((t) => (
              <span key={t} className="rounded-full bg-[var(--color-bg)] px-2.5 py-0.5 font-medium text-[var(--color-text)]">
                {t}
              </span>
            ))}
          </div>
          <p className="mt-2 text-sm whitespace-pre-wrap text-[var(--color-text)]">{b.originaltext}</p>
          {b.bezugDatum && (
            <p className="mt-2 text-xs text-[var(--color-text-muted)]">↳ verknüpft mit {format(new Date(b.bezugDatum), "dd.MM.yyyy", { locale: de })}</p>
          )}
        </div>
      ))}
      {bausteine.length === 0 && <p className={`${cardCls} text-sm text-[var(--color-text-muted)]`}>Noch keine Bausteine erfasst.</p>}
    </div>
  );
}

// Nach Kapitel gruppiert (Board): eine Spalte je Manual-Kapitel/-Schritt. Bausteine ohne (noch) gesetzte
// vorläufige Kategorie landen zusätzlich in einer eigenen "Nicht zugeordnet"-Spalte, statt aus der Ansicht
// zu verschwinden - im Prompt nicht explizit vorgesehen, aber notwendig, damit kein erfasster Baustein
// unsichtbar wird. Ein Baustein erscheint hier bewusst nur in EINER Spalte (die vorläufige Kategorie ist
// unverbindlich und einfach gesetzt) - die im Prompt beschriebene Mehrfachzuordnung mit vollem
// Manual-Kontext ist Teil der späteren Berichtsgenerierung, nicht dieser laufenden Übersicht.
function KapitelBoard({ bausteine }: { bausteine: BausteinAnsicht[] }) {
  const nichtZugeordnet = bausteine.filter((b) => !b.vorlaeufigeKategorie);

  return (
    <div className="flex gap-4 overflow-x-auto pb-2">
      {BERICHTS_KAPITEL_ORDER.map((k) => (
        <KapitelSpalte key={k} kapitel={k} bausteine={bausteine.filter((b) => b.vorlaeufigeKategorie === k)} />
      ))}
      {nichtZugeordnet.length > 0 && (
        <div className="flex w-72 shrink-0 flex-col gap-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-semibold text-[var(--color-text-muted)]">Nicht zugeordnet</span>
            <span className="rounded-full bg-[var(--color-border)] px-2 py-0.5 text-xs font-semibold text-[var(--color-text)]">
              {nichtZugeordnet.length}
            </span>
          </div>
          <div className="flex flex-col gap-2">
            {nichtZugeordnet.map((b) => (
              <BausteinKarte key={b.id} baustein={b} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function KapitelSpalte({ kapitel, bausteine }: { kapitel: BerichtsKapitel; bausteine: BausteinAnsicht[] }) {
  const info = BERICHTS_KAPITEL_INFO[kapitel];
  const duenn = bausteine.length > 0 && bausteine.length < DUENN_BESETZT_SCHWELLE;
  const leer = bausteine.length === 0;

  return (
    <div
      className={`flex w-72 shrink-0 flex-col gap-2 rounded-[var(--radius-card)] p-2 ${
        leer ? "bg-[var(--color-warn-soft)]" : duenn ? "bg-[var(--color-warn-soft)]/50" : ""
      }`}
    >
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-semibold text-[var(--color-text)]">{info.label}</span>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
            leer || duenn ? "bg-[var(--color-warn-text)] text-white" : "bg-[var(--color-border)] text-[var(--color-text)]"
          }`}
        >
          {bausteine.length}
        </span>
      </div>
      {leer && <p className="px-1 text-xs text-[var(--color-warn-text)]">Noch keine Bausteine erfasst.</p>}
      <div className="flex flex-col gap-2">
        {bausteine.map((b) => (
          <BausteinKarte key={b.id} baustein={b} />
        ))}
      </div>
    </div>
  );
}

function BausteinKarte({ baustein }: { baustein: BausteinAnsicht }) {
  return (
    <div className="rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3 shadow-[var(--shadow-soft)]">
      <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-[var(--color-text-muted)]">
        <span>{format(new Date(baustein.erfassungszeitpunkt), "dd.MM.yyyy", { locale: de })}</span>
        <span>· {baustein.erstellerName}</span>
      </div>
      <p className="mt-1.5 line-clamp-4 text-[13px] text-[var(--color-text)]">{baustein.originaltext}</p>
      {baustein.bezugDatum && (
        <p className="mt-1.5 text-[11px] text-[var(--color-text-muted)]">↳ verknüpft mit {format(new Date(baustein.bezugDatum), "dd.MM.yyyy", { locale: de })}</p>
      )}
    </div>
  );
}

function Badge({ kapitel }: { kapitel: BerichtsKapitel }) {
  const info = BERICHTS_KAPITEL_INFO[kapitel];
  return <span className={`rounded-full px-2.5 py-0.5 font-semibold ${info.badgeCls}`}>{info.label}</span>;
}
