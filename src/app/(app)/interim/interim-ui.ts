// Geteilte Präsentations-Klassen für den Interimsmodus - Angleichung an das PROS-Design-System
// (design/PROS-DESIGN-SYSTEM.md), ausschließlich visuell. Keine Komponente, keine Logik, nur
// Tailwind-Klassenkonstanten, damit Card/Input/Button-Optik in allen Interim-Dateien konsistent
// bleibt, ohne die jeweilige Komponentenlogik anzufassen.

export const cardCls = "rounded-[var(--pros-r-md)] border border-[var(--pros-border-strong)] bg-[var(--color-surface)] p-5 shadow-[var(--pros-shadow)]";

export const cardInteractiveCls =
  "rounded-[var(--pros-r-md)] border border-[var(--pros-border-strong)] bg-[var(--color-surface)] p-5 shadow-[var(--pros-shadow)] transition-[transform,box-shadow] duration-[170ms] ease-[var(--pros-ease)] hover:-translate-y-0.5 hover:shadow-[var(--pros-shadow-hover)]";

// Bewusst ohne w-full - im Original war das je Einsatzort unterschiedlich (volle Breite in
// Formularen, aber kompakte Inline-Breite in Filterzeilen); w-full wird dort ergänzt, wo es die
// ursprüngliche Verwendung auch schon hatte.
export const inputCls =
  "rounded-[var(--pros-r-sm)] border border-[var(--pros-border-strong)] bg-[var(--color-bg)] px-3.5 py-2.5 text-sm text-[var(--color-text)] outline-none transition-colors focus:border-[var(--color-primary)]";

export const labelCls = "text-xs font-medium text-[var(--color-text-muted)]";

// active:scale-[0.97] auf allen Buttons - Emil-Design-Eng-Pass: Buttons brauchen echtes
// Press-Feedback, nicht nur Hover. translate-y-0 im active-Zustand verhindert, dass sich Lift
// und Press-Scale gegenseitig ins Gehege kommen.
export const buttonPrimaryCls =
  "rounded-[var(--pros-r-sm)] bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-white shadow-[var(--pros-shadow)] transition-[transform,box-shadow,background-color] duration-[170ms] ease-[var(--pros-ease)] hover:-translate-y-0.5 hover:bg-[var(--color-primary-hover)] active:translate-y-0 active:scale-[0.97] disabled:opacity-50 disabled:hover:translate-y-0 disabled:active:scale-100";

// Petrol- statt Weißtext auf Gold: Weiß auf #E3A72C liegt bei ~2.1:1 Kontrast (WCAG-AA-Fail,
// braucht 4.5:1). Petrol auf Gold liegt bei ~5.6:1 und besteht - gefunden im Taste-Skill-Pass
// (Button-Kontrastprüfung), behoben im Impeccable-Pass.
export const buttonGoldCls =
  "rounded-[var(--pros-r-sm)] bg-[var(--color-gold)] px-4 py-2.5 text-sm font-semibold text-[var(--color-primary)] shadow-[var(--pros-shadow)] transition-[transform,box-shadow,opacity] duration-[170ms] ease-[var(--pros-ease)] hover:-translate-y-0.5 hover:opacity-90 active:translate-y-0 active:scale-[0.97] disabled:opacity-50 disabled:hover:translate-y-0 disabled:active:scale-100";

export const buttonSecondaryCls =
  "rounded-[var(--pros-r-sm)] border border-[var(--pros-border-strong)] bg-[var(--color-surface)] px-4 py-2.5 text-sm font-semibold text-[var(--color-primary)] shadow-[var(--pros-shadow)] transition-[transform,box-shadow,background-color] duration-[170ms] ease-[var(--pros-ease)] hover:-translate-y-0.5 hover:bg-[var(--pros-sage-pale)] active:translate-y-0 active:scale-[0.97]";

// Für neutrale Prüf-/Kontrollaktionen ("Zeitüberschneidungen prüfen") - Salbei statt Rot, damit
// eine normale Prüfung nicht wie eine destruktive Aktion wirkt. Rot bleibt echten
// Fehlern/Konflikten vorbehalten (buttonDangerSolidCls).
export const buttonSageOutlineCls =
  "rounded-[var(--pros-r-sm)] border border-[var(--pros-sage)] bg-[var(--pros-sage-pale)] px-4 py-2.5 text-sm font-semibold text-[var(--color-primary)] shadow-[var(--pros-shadow)] transition-[transform,box-shadow,background-color] duration-[170ms] ease-[var(--pros-ease)] hover:-translate-y-0.5 hover:bg-[var(--pros-sage-soft)] active:translate-y-0 active:scale-[0.97]";

export const buttonDangerSolidCls =
  "rounded-[var(--pros-r-sm)] bg-[var(--pros-status-critical-text)] px-4 py-2.5 text-sm font-semibold text-white shadow-[var(--pros-shadow)] transition-[transform,opacity] duration-[170ms] ease-[var(--pros-ease)] hover:-translate-y-0.5 hover:opacity-90 active:translate-y-0 active:scale-[0.97] disabled:opacity-50 disabled:hover:translate-y-0 disabled:active:scale-100";

export const noticeWarnCls = "rounded-[var(--pros-r-sm)] bg-[var(--pros-status-attention-bg)] p-3.5";
export const noticeCriticalCls = "rounded-[var(--pros-r-sm)] bg-[var(--pros-status-critical-bg)] px-3.5 py-2.5";

// Wiederverwendet dieselbe Salbei-Pille wie die Angebotsart-Badges - gruppiert lange
// Formular-/Detailfelder in Abschnitte, macht Salbei als sekundäre UI-Farbe sichtbarer, ohne die
// Fläche einzufärben.
export const groupPillCls = "inline-block rounded-full bg-[var(--pros-sage-pale)] px-2.5 py-0.5 text-[11px] font-semibold text-[var(--color-primary)]";
