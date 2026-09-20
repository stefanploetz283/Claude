"use client";

import { useActionState, useRef, startTransition } from "react";
import { updateOwnAvatar, type AvatarActionState } from "./actions";

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

export function GreetingHeader({
  name,
  greeting,
  avatarUrl,
  hintText,
  activeCount,
  warnCount,
  weekly,
}: {
  name: string;
  greeting: string;
  avatarUrl: string | null;
  hintText: string;
  activeCount: number;
  warnCount: number;
  weekly: { label: string; hours: number; isToday: boolean }[];
}) {
  const [state, formAction] = useActionState<AvatarActionState, FormData>(updateOwnAvatar, undefined);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const firstName = name.trim().split(/\s+/)[0] ?? name;
  const maxHours = Math.max(1, ...weekly.map((w) => w.hours));

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.set("avatar", file);
    startTransition(() => {
      formAction(fd);
    });
  }

  return (
    <div className="dash-card-enter relative overflow-hidden rounded-[var(--radius-card)] bg-[var(--color-primary)] shadow-[var(--shadow-soft)]">
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full"
        viewBox="0 0 800 220"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path d="M0 150 C 150 210, 350 90, 550 150 S 750 210, 800 160 V220 H0 Z" fill="#8AA187" opacity="0.22" />
        <path d="M0 175 C 200 130, 380 220, 580 175 S 760 130, 800 185 V220 H0 Z" fill="#F7F3EA" opacity="0.1" />
        <circle cx="740" cy="45" r="70" fill="#E3A72C" opacity="0.14" />
      </svg>

      <div className="relative flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-7">
        <div className="flex items-center gap-4">
          <div className="group relative shrink-0">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              aria-label="Profilbild ändern"
              className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border-2 border-white/40 bg-[var(--color-sage)] text-lg font-semibold text-white transition-[border-color,transform] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:border-white/70 active:scale-[0.96] active:duration-100"
            >
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                initials(name)
              )}
            </button>
            <span className="pointer-events-none absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-gold)] text-white opacity-0 shadow-sm transition-opacity duration-200 ease-out group-hover:opacity-100">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
              </svg>
            </span>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          </div>

          <div>
            <div className="font-script pb-1 text-[28px] leading-[1.15] text-[var(--color-gold)] sm:text-[32px]">{greeting},</div>
            <h1 className="-mt-1.5 text-xl font-bold text-white sm:text-2xl">{firstName}</h1>
            <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[var(--color-gold)] px-3 py-1 text-xs font-semibold text-white">
              {hintText}
            </div>
            {state?.error && <p className="mt-1.5 text-xs font-medium text-[#ffd9cc]">{state.error}</p>}
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="hidden gap-4 sm:flex">
            <div className="text-center">
              <div className="text-2xl leading-none font-bold text-white">{activeCount}</div>
              <div className="mt-1 text-[11px] font-medium tracking-wide text-white/70 uppercase">Aktive Fälle</div>
            </div>
            <div className="text-center">
              <div className="text-2xl leading-none font-bold text-[var(--color-gold)]">{warnCount}</div>
              <div className="mt-1 text-[11px] font-medium tracking-wide text-white/70 uppercase">Kontingent-Hinweise</div>
            </div>
          </div>

          <div className="flex items-end gap-1.5 rounded-[var(--radius-control)] bg-white/10 px-3.5 py-3">
            {weekly.map((day) => (
              <div key={day.label} className="flex flex-col items-center gap-1">
                <div className="flex h-12 w-3 items-end overflow-hidden rounded-full bg-white/15">
                  <div
                    className="w-full rounded-full transition-[height]"
                    style={{
                      height: `${Math.max(8, (day.hours / maxHours) * 100)}%`,
                      background: day.isToday ? "var(--color-gold)" : "#8AA187",
                    }}
                  />
                </div>
                <span className={`text-[10px] font-medium ${day.isToday ? "text-[var(--color-gold)]" : "text-white/60"}`}>{day.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
