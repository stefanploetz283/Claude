"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { BuchungsFormular, type CaseOption, type RaumOption, type MitarbeiterinOption } from "./buchungs-formular";
import { AusfallDialog } from "./ausfall-dialog";
import { TerminDiktatWidget } from "./termin-diktat-widget";
import { SerieFormular } from "./serie-formular";
import { ProsModal } from "@/components/pros/pros-modal";
import { buttonPrimaryCls, buttonSecondaryCls, buttonSageOutlineCls } from "../cases/case-ui";
import { IconPlus } from "@/components/pros/pros-icons";

export type KalenderBlock = {
  key: string;
  employeeId: string;
  tagIso: string;
  startMinute: number;
  endMinute: number;
  kind: "frei" | "termin";
  slotId: string | null;
  slotVorlageRaumId: string | null;
  termin: {
    id: string;
    heading: string;
    subline: string;
    raumName: string | null;
  } | null;
};

export type KalenderMitarbeiterin = { id: string; name: string; color: string };

const PX_PRO_MINUTE = 1.1;
const DEFAULT_START_MINUTE = 8 * 60;
const DEFAULT_END_MINUTE = 19 * 60;

function formatMinute(m: number): string {
  const h = Math.floor(m / 60)
    .toString()
    .padStart(2, "0");
  const min = (m % 60).toString().padStart(2, "0");
  return `${h}:${min}`;
}

type Modal =
  | { type: "slot"; block: KalenderBlock }
  | { type: "adhoc" }
  | { type: "diktat" }
  | { type: "serie" }
  | { type: "ausfall"; terminId: string; titel: string }
  | null;

export function Tageskalender({
  tagIso,
  mitarbeiterinnen,
  bloecke,
  caseOptions,
  raumOptions,
  canBookForOthers,
  canOverrideConflicts,
  currentUserId,
}: {
  tagIso: string;
  mitarbeiterinnen: KalenderMitarbeiterin[];
  bloecke: KalenderBlock[];
  caseOptions: CaseOption[];
  raumOptions: RaumOption[];
  canBookForOthers: boolean;
  canOverrideConflicts: boolean;
  currentUserId: string;
}) {
  const [modal, setModal] = useState<Modal>(null);

  const { startMinute, endMinute } = useMemo(() => {
    let min = DEFAULT_START_MINUTE;
    let max = DEFAULT_END_MINUTE;
    for (const b of bloecke) {
      min = Math.min(min, Math.floor(b.startMinute / 60) * 60);
      max = Math.max(max, Math.ceil(b.endMinute / 60) * 60);
    }
    return { startMinute: min, endMinute: max };
  }, [bloecke]);

  const totalMinutes = endMinute - startMinute;
  const stunden: number[] = [];
  for (let h = startMinute; h <= endMinute; h += 60) stunden.push(h);

  const mitarbeiterinnenOptions: MitarbeiterinOption[] = mitarbeiterinnen.map((m) => ({ id: m.id, name: m.name }));
  const tagLabel = format(new Date(`${tagIso}T00:00:00`), "EEEE, dd.MM.yyyy", { locale: de });

  function schliesseModal() {
    setModal(null);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end gap-2">
        <button onClick={() => setModal({ type: "diktat" })} className={`inline-flex items-center gap-1.5 ${buttonSageOutlineCls}`}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="2" width="6" height="12" rx="3" />
            <path d="M5 10a7 7 0 0 0 14 0" />
            <line x1="12" y1="19" x2="12" y2="22" />
          </svg>
          Termin diktieren
        </button>
        <button onClick={() => setModal({ type: "serie" })} className={buttonSecondaryCls}>
          Serie anlegen
        </button>
        <button onClick={() => setModal({ type: "adhoc" })} className={`${buttonPrimaryCls} inline-flex items-center gap-2`}>
          <IconPlus size={16} />
          Termin (frei wählen)
        </button>
      </div>

      {mitarbeiterinnen.length === 0 ? (
        <p className="text-sm text-[var(--color-text-muted)]">Keine Mitarbeiterin sichtbar.</p>
      ) : (
        <div className="overflow-x-auto rounded-[var(--pros-r-md)] border border-[var(--pros-border-strong)] bg-[var(--color-surface)] shadow-[var(--pros-shadow)]">
          <div className="flex min-w-max">
            {/* Zeitachse */}
            <div className="w-14 shrink-0 border-r border-[var(--pros-border-default)] pt-8">
              {stunden.map((h) => (
                <div key={h} style={{ height: 60 * PX_PRO_MINUTE }} className="relative">
                  <span className="absolute -top-2.5 right-2 text-[11px] text-[var(--pros-meta)]">{formatMinute(h)}</span>
                </div>
              ))}
            </div>

            {mitarbeiterinnen.map((m) => {
              const eigeneBloecke = bloecke.filter((b) => b.employeeId === m.id);
              return (
                <div key={m.id} className="min-w-52 flex-1 border-r border-[var(--pros-border-default)] last:border-r-0">
                  <div className="flex h-8 items-center gap-1.5 border-b border-[var(--pros-border-default)] px-2">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: m.color }} />
                    <span className="truncate text-xs font-semibold text-[var(--color-text)]">{m.name}</span>
                  </div>
                  <div className="relative" style={{ height: totalMinutes * PX_PRO_MINUTE }}>
                    {stunden.map((h) => (
                      <div
                        key={h}
                        className="absolute right-0 left-0 border-t border-[var(--pros-border-subtle)]"
                        style={{ top: (h - startMinute) * PX_PRO_MINUTE }}
                      />
                    ))}
                    {eigeneBloecke.map((b) => {
                      const top = (b.startMinute - startMinute) * PX_PRO_MINUTE;
                      const height = Math.max((b.endMinute - b.startMinute) * PX_PRO_MINUTE, 18);
                      if (b.kind === "frei") {
                        return (
                          <button
                            key={b.key}
                            onClick={() => setModal({ type: "slot", block: b })}
                            style={{ top, height }}
                            className="absolute right-1 left-1 rounded-[var(--pros-r-sm)] border border-dashed border-[var(--pros-border-strong)] bg-[var(--color-bg)] px-1.5 py-0.5 text-left text-[11px] text-[var(--pros-meta)] transition-colors duration-150 hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
                          >
                            {formatMinute(b.startMinute)} frei
                          </button>
                        );
                      }
                      return (
                        <button
                          key={b.key}
                          onClick={() => b.termin && setModal({ type: "ausfall", terminId: b.termin.id, titel: b.termin.heading })}
                          style={{ top, height, background: `${m.color}1f`, borderColor: m.color }}
                          className="absolute right-1 left-1 overflow-hidden rounded-[var(--pros-r-sm)] border-l-[3px] px-1.5 py-0.5 text-left text-[11px] text-[var(--color-text)] shadow-[var(--pros-shadow)] transition-opacity duration-150 hover:opacity-85"
                        >
                          <div className="truncate font-semibold">{b.termin?.heading}</div>
                          {(b.termin?.subline || b.termin?.raumName) && (
                            <div className="truncate text-[10px] text-[var(--pros-meta)]">
                              {[b.termin?.subline, b.termin?.raumName].filter(Boolean).join(" · ")}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {modal && (
        <ProsModal
          title={
            modal.type === "ausfall"
              ? "Termin ausfallen lassen"
              : modal.type === "diktat"
                ? "Termin diktieren"
                : modal.type === "serie"
                  ? "Serientermin anlegen"
                  : "Termin buchen"
          }
          onClose={schliesseModal}
        >
          {modal.type === "slot" && (
            <BuchungsFormular
              slot={{
                slotId: modal.block.slotId!,
                employeeId: modal.block.employeeId,
                tagLabel,
                zeitLabel: `${formatMinute(modal.block.startMinute)}–${formatMinute(modal.block.endMinute)}`,
                standardRaumId: modal.block.slotVorlageRaumId,
              }}
              caseOptions={caseOptions}
              raumOptions={raumOptions}
              mitarbeiterinnen={mitarbeiterinnenOptions}
              canBookForOthers={canBookForOthers}
              canOverrideConflicts={canOverrideConflicts}
              currentUserId={currentUserId}
              onDone={schliesseModal}
            />
          )}

          {modal.type === "adhoc" && (
            <BuchungsFormular
              adHoc={{ defaultDate: tagIso }}
              caseOptions={caseOptions}
              raumOptions={raumOptions}
              mitarbeiterinnen={mitarbeiterinnenOptions}
              canBookForOthers={canBookForOthers}
              canOverrideConflicts={canOverrideConflicts}
              currentUserId={currentUserId}
              onDone={schliesseModal}
            />
          )}

          {modal.type === "diktat" && (
            <TerminDiktatWidget
              currentUserId={currentUserId}
              mitarbeiterinnen={mitarbeiterinnenOptions}
              canBookForOthers={canBookForOthers}
              caseOptions={caseOptions}
              raumOptions={raumOptions}
              onDone={schliesseModal}
            />
          )}

          {modal.type === "serie" && (
            <SerieFormular
              defaultDate={tagIso}
              currentUserId={currentUserId}
              mitarbeiterinnen={mitarbeiterinnenOptions}
              canBookForOthers={canBookForOthers}
              caseOptions={caseOptions}
              raumOptions={raumOptions}
              onDone={schliesseModal}
            />
          )}

          {modal.type === "ausfall" && <AusfallDialog terminId={modal.terminId} titel={modal.titel} onDone={schliesseModal} />}
        </ProsModal>
      )}
    </div>
  );
}
