"use client";

import { useActionState, useRef, startTransition } from "react";
import { updateOwnAvatar, type AvatarActionState } from "../dashboard/actions";

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

const ZITATE = [
  "Entwicklung beginnt mit einem guten nächsten Schritt.",
  "Kleine Schritte, große Wirkung.",
  "Verstehen kommt vor Verändern.",
  "Beziehung trägt, wo Druck scheitert.",
  "Jeder Tag zählt für jemanden, der auf uns baut.",
];

function dailyZitat(): string {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  return ZITATE[dayOfYear % ZITATE.length];
}

export function HeuteHero({
  name,
  greeting,
  avatarUrl,
}: {
  name: string;
  greeting: string;
  avatarUrl: string | null;
}) {
  const [state, formAction] = useActionState<AvatarActionState, FormData>(updateOwnAvatar, undefined);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const firstName = name.trim().split(/\s+/)[0] ?? name;
  const dateLabel = new Date().toLocaleDateString("de-DE", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });

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
      {/* Organische Flächen statt echtem Foto, bis eine passende, personenfreie Aufnahme vorliegt. */}
      <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 1000 260" preserveAspectRatio="none" aria-hidden="true">
        <path d="M600 0 C 720 40, 780 120, 760 260 L 1000 260 L 1000 0 Z" fill="#8AA187" opacity="0.55" />
        <path d="M700 0 C 850 30, 920 140, 880 260 L 1000 260 L 1000 0 Z" fill="#0B3D46" opacity="0.65" />
        <circle cx="900" cy="70" r="90" fill="#E3A72C" opacity="0.5" />
        <path d="M0 190 C 180 250, 420 130, 640 190 S 900 250, 1000 200 V260 H0 Z" fill="#F7F3EA" opacity="0.08" />
      </svg>

      <div className="relative flex flex-col gap-6 p-6 sm:p-8">
        <div className="flex items-start justify-between gap-4">
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
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            </div>

            <div>
              <div className="font-script pb-1 text-[26px] leading-[1.15] text-[var(--color-gold)] sm:text-[30px]">{greeting},</div>
              <h1 className="-mt-1.5 text-xl font-bold text-white sm:text-2xl">{firstName}</h1>
              {state?.error && <p className="mt-1 text-xs font-medium text-[#ffd9cc]">{state.error}</p>}
            </div>
          </div>
          <div className="hidden text-right text-xs text-white/70 capitalize sm:block">{dateLabel}</div>
        </div>

        <blockquote className="relative max-w-md border-l-2 border-[var(--color-gold)] pl-4 text-[15px] leading-snug text-white/90 italic">
          „{dailyZitat()}“
        </blockquote>
      </div>
    </div>
  );
}
