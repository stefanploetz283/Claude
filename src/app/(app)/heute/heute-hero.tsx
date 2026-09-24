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

// Profilbild-Upload liegt jetzt im Sidebar-Profilbereich (siehe app-sidebar.tsx) statt hier im Hero -
// visueller Polish-Pass, Funktion unverändert vorhanden, nur verschoben.
export function HeuteHero({ name, greeting }: { name: string; greeting: string }) {
  const firstName = name.trim().split(/\s+/)[0] ?? name;
  const dateLabel = new Date().toLocaleDateString("de-DE", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });

  return (
    <div className="dash-card-enter grid min-h-[180px] grid-cols-1 items-stretch gap-6 lg:grid-cols-[430px_minmax(0,1fr)] lg:gap-[38px]">
      {/* Copy: liegt direkt auf der Creme-Arbeitsfläche, keine eigene Karte (siehe Referenz-Hero). */}
      <div className="order-2 flex flex-col justify-center gap-1 pt-1 lg:order-1 lg:pt-5 lg:pl-1">
        <div className="font-script text-[32px] leading-none text-[color-mix(in_srgb,var(--color-gold)_88%,black)] sm:text-[38px]">{greeting},</div>
        <h1 className="font-display -mt-1 text-[46px] leading-[0.98] tracking-[-0.02em] text-[var(--color-text)] sm:text-[64px] lg:text-[72px]">{firstName}</h1>
        <p className="mt-1.5 text-[15px] text-[var(--color-text-muted)]">Heute ist ein guter Tag, um einen Unterschied zu machen.</p>
        <p className="mt-1 text-xs text-[var(--pros-meta)] capitalize">{dateLabel}</p>
      </div>

      {/* Media: fester Bildslot nach Referenz-Geometrie. Bis ein freigegebenes Foto vorliegt, bleiben
          es datenschutzsichere abstrakte Flächen statt eines echten Kinder-/Klientenfotos (siehe
          design/PROS-DESIGN-SYSTEM.md Abschnitt 19 und CLAUDE.md-Design-Contract). */}
      <div className="relative order-1 min-h-[180px] overflow-hidden rounded-[28px] lg:order-2 lg:min-h-[205px] lg:rounded-[48px_0_0_48px]">
        <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 1000 260" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          <rect width="1000" height="260" fill="#2C4D46" />
          <path d="M600 0 C 720 40, 780 120, 760 260 L 1000 260 L 1000 0 Z" fill="#8AA187" opacity="0.55" />
          <path d="M700 0 C 850 30, 920 140, 880 260 L 1000 260 L 1000 0 Z" fill="var(--color-primary)" opacity="0.65" />
          <circle cx="900" cy="70" r="90" fill="var(--color-gold)" opacity="0.5" />
          <path d="M0 190 C 180 250, 420 130, 640 190 S 900 250, 1000 200 V260 H0 Z" fill="#F7F3EA" opacity="0.08" />
        </svg>
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(90deg, rgba(44,77,70,.72) 0%, rgba(66,97,84,.44) 29%, rgba(32,54,52,.10) 58%, rgba(0,0,0,0) 78%), linear-gradient(0deg, rgba(11,61,70,.05), rgba(11,61,70,.02))",
          }}
        />
        <blockquote className="font-display absolute top-6 left-6 max-w-[240px] text-[19px] leading-[1.18] text-[#FFF9ED] italic drop-shadow-[0_2px_12px_rgba(0,0,0,0.18)] sm:top-[55px] sm:left-[44px] sm:max-w-[280px] sm:text-[24px] lg:left-[78px] lg:max-w-[320px]">
          „{dailyZitat()}“
          <span className="mt-3.5 block h-[3px] w-14 rounded-full bg-[var(--color-gold)]" />
        </blockquote>
      </div>
    </div>
  );
}
