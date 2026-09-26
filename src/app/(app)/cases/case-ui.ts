// Geteilte Präsentations-Klassen für den Fälle-Bereich (Fallübersicht + Fallakte) - Angleichung an
// das PROS-Design-System (design/PROS-DESIGN-SYSTEM.md), ausschließlich visuell. Keine Komponente,
// keine Logik, nur Tailwind-Klassenkonstanten - selbes Muster wie interim/interim-ui.ts, damit
// Card/Input/Button-Optik über alle Fall-Dateien konsistent bleibt, ohne Komponentenlogik anzufassen.

export const cardCls = "rounded-[var(--pros-r-md)] border border-[var(--pros-border-strong)] bg-[var(--color-surface)] p-5 shadow-[var(--pros-shadow)]";

export const cardInteractiveCls =
  "rounded-[var(--pros-r-md)] border border-[var(--pros-border-strong)] bg-[var(--color-surface)] p-5 shadow-[var(--pros-shadow)] transition-[transform,box-shadow] duration-[170ms] ease-[var(--pros-ease)] hover:-translate-y-0.5 hover:shadow-[var(--pros-shadow-hover)]";

// Bewusst ohne w-full, siehe interim-ui.ts - wird dort ergänzt, wo es die ursprüngliche Verwendung
// auch schon hatte (Formulare volle Breite, Filterzeilen kompakt).
export const inputCls =
  "rounded-[var(--pros-r-sm)] border border-[var(--pros-border-strong)] bg-[var(--color-bg)] px-3.5 py-2.5 text-sm text-[var(--color-text)] outline-none transition-colors focus:border-[var(--color-primary)]";

export const labelCls = "text-xs font-medium text-[var(--color-text-muted)]";

export const buttonPrimaryCls =
  "rounded-[var(--pros-r-sm)] bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-white shadow-[var(--pros-shadow)] transition-[transform,box-shadow,background-color] duration-[170ms] ease-[var(--pros-ease)] hover:-translate-y-0.5 hover:bg-[var(--color-primary-hover)] active:translate-y-0 active:scale-[0.97] disabled:opacity-50 disabled:hover:translate-y-0 disabled:active:scale-100";

export const buttonSecondaryCls =
  "rounded-[var(--pros-r-sm)] border border-[var(--pros-border-strong)] bg-[var(--color-surface)] px-4 py-2.5 text-sm font-semibold text-[var(--color-primary)] shadow-[var(--pros-shadow)] transition-[transform,box-shadow,background-color] duration-[170ms] ease-[var(--pros-ease)] hover:-translate-y-0.5 hover:bg-[var(--pros-sage-pale)] active:translate-y-0 active:scale-[0.97] disabled:opacity-50 disabled:hover:translate-y-0 disabled:active:scale-100";

// Outline-Variante ohne Schatten/Lift für Formular-Sekundäraktionen (Speichern-Begleiter), siehe
// bisherige border-[var(--color-primary)]-Buttons in den Case-Detail-Formularen.
export const buttonOutlineCls =
  "rounded-[var(--pros-r-sm)] border border-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--color-primary)] transition-[background-color,color,transform] duration-[170ms] ease-[var(--pros-ease)] hover:bg-[var(--color-primary)] hover:text-white active:scale-[0.97] disabled:opacity-50 disabled:active:scale-100";

// Für neutrale Prüf-/Kontrollaktionen - Salbei statt Rot, damit eine normale Aktion nicht wie eine
// destruktive wirkt. Rot bleibt echten Gefahrenzone-Aktionen vorbehalten (buttonDangerOutlineCls/
// buttonDangerSolidCls).
export const buttonSageOutlineCls =
  "rounded-[var(--pros-r-sm)] border border-[var(--pros-sage)] bg-[var(--pros-sage-pale)] px-4 py-2.5 text-sm font-semibold text-[var(--color-primary)] shadow-[var(--pros-shadow)] transition-[transform,box-shadow,background-color] duration-[170ms] ease-[var(--pros-ease)] hover:-translate-y-0.5 hover:bg-[var(--pros-sage-soft)] active:translate-y-0 active:scale-[0.97]";

export const buttonDangerOutlineCls =
  "rounded-[var(--pros-r-sm)] border border-[var(--pros-status-critical-text)] px-4 py-2.5 text-sm font-semibold text-[var(--pros-status-critical-text)] transition-[background-color,color,transform] duration-[170ms] ease-[var(--pros-ease)] hover:bg-[var(--pros-status-critical-text)] hover:text-white active:scale-[0.97] disabled:opacity-50 disabled:active:scale-100";

export const buttonDangerSolidCls =
  "rounded-[var(--pros-r-sm)] bg-[var(--pros-status-critical-text)] px-4 py-2.5 text-sm font-semibold text-white shadow-[var(--pros-shadow)] transition-[transform,opacity] duration-[170ms] ease-[var(--pros-ease)] hover:-translate-y-0.5 hover:opacity-90 active:translate-y-0 active:scale-[0.97] disabled:opacity-50 disabled:hover:translate-y-0 disabled:active:scale-100";

export const noticeWarnCls = "rounded-[var(--pros-r-sm)] bg-[var(--pros-status-attention-bg)] p-4";
export const noticeInfoCls = "rounded-[var(--pros-r-sm)] bg-[var(--pros-sage-pale)] p-4";
export const noticeCriticalCls = "rounded-[var(--pros-r-sm)] bg-[var(--pros-status-critical-bg)] px-3.5 py-2.5";

// Wiederverwendet dieselbe Salbei-Pille wie interim/case-details-card.tsx - gruppiert lange
// Formular-/Detailfelder in Abschnitte, ohne Felder umzuordnen oder umzubenennen.
export const groupPillCls = "inline-block rounded-full bg-[var(--pros-sage-pale)] px-2.5 py-0.5 text-[11px] font-semibold text-[var(--color-primary)]";

// Fallübersicht-Filterleiste (dashboard + admin/alle-faelle): identisches Optik-Muster wie
// case-ui.inputCls, aber Oberfläche statt Hintergrundfarbe (Filterzeile liegt auf Warmweiß, nicht auf
// Formularkarte).
export const filterFieldCls =
  "rounded-[var(--pros-r-sm)] border border-[var(--pros-border-strong)] bg-[var(--color-surface)] px-3.5 py-2.5 text-sm text-[var(--color-text)] outline-none transition-colors focus:border-[var(--color-primary)]";

// ---- Ergänzungen Abschlussblock 1A (Fachbox, Nachrichten, Admin-Bereiche) ----------------------
// Kompakte Aktionen für Listen-/Tabellenzeilen und dichte Formularzeilen: gleiche Radius-/Motion-Regeln
// wie die großen Buttons, nur mit engerem Padding (kein Ersatz für buttonPrimaryCls & Co.).

export const buttonSmPrimaryCls =
  "rounded-[var(--pros-r-sm)] bg-[var(--color-primary)] px-3.5 py-1.5 text-xs font-semibold text-white transition-[transform,background-color] duration-[170ms] ease-[var(--pros-ease)] hover:bg-[var(--color-primary-hover)] active:scale-[0.97] disabled:opacity-50 disabled:active:scale-100";

export const buttonSmOutlineCls =
  "rounded-[var(--pros-r-sm)] border border-[var(--color-primary)] px-3.5 py-1.5 text-xs font-semibold text-[var(--color-primary)] transition-[background-color,color,transform] duration-[170ms] ease-[var(--pros-ease)] hover:bg-[var(--color-primary)] hover:text-white active:scale-[0.97] disabled:opacity-50 disabled:active:scale-100";

// Textaktionen in Zeilen (Speichern / Ausblenden / Löschen) - Muster wie in Räume, Warteliste, Dokumente.
export const linkActionCls = "text-xs font-medium text-[var(--color-primary)] hover:underline disabled:opacity-50";
export const linkMutedCls = "text-xs font-medium text-[var(--color-text-muted)] hover:underline disabled:opacity-50";
export const linkDangerCls = "text-xs font-medium text-[var(--pros-status-critical-text)] hover:underline disabled:opacity-50";

// Inline-Fehler/-Erfolg unter Formularen. Erfolg nutzt die Active-Statusfläche statt Salbei-Text auf Weiß.
export const errorTextCls = "text-sm text-[var(--pros-status-critical-text)]";
export const noticeSuccessCls =
  "inline-flex items-center gap-2 rounded-[var(--pros-r-sm)] bg-[var(--pros-status-active-bg)] px-3.5 py-2.5 text-sm font-medium text-[var(--pros-status-active-text)]";

// Unterstrichene Tabs (identisch zu CaseTabs / ZeitKapazitaetTabs) für Umschalter außerhalb der Routen-Tabs.
export const tabBarCls = "flex gap-1 overflow-x-auto border-b border-[var(--pros-border-default)]";
export const tabBaseCls =
  "shrink-0 rounded-t-[var(--pros-r-sm)] px-4 py-2.5 text-[13.5px] transition-colors duration-[170ms] ease-[var(--pros-ease)]";
export const tabActiveCls = "border-b-2 border-[var(--color-primary)] font-semibold text-[var(--color-primary)]";
export const tabIdleCls =
  "font-medium text-[var(--color-text-muted)] hover:bg-[var(--pros-sage-pale)]/40 hover:text-[var(--color-text)]";

// Tabellen-Hülle und -Kopf (ruhiger Primary-Soft-Kopf wie in Fall-Terminen/Dokumenten).
export const tableWrapCls =
  "overflow-x-auto rounded-[var(--pros-r-md)] border border-[var(--pros-border-strong)] bg-[var(--color-surface)] shadow-[var(--pros-shadow)]";
export const theadCls = "bg-[var(--color-primary-soft)] text-[11px] font-bold tracking-wide text-[var(--color-primary)] uppercase";
export const trCls = "border-t border-[var(--pros-border-default)] transition-colors hover:bg-[var(--pros-sage-pale)]/40";

// Seiten-Kopf (h1 + Untertitel) der Admin-/Fachbox-/Nachrichten-Seiten - gleiche Größe wie Aufgaben,
// Fälle, Finanzen.
export const pageTitleCls = "text-2xl font-semibold tracking-tight text-[var(--color-primary)]";
export const pageSubtitleCls = "mt-1 text-sm text-[var(--color-text-muted)]";

// Zurückhaltender Kopf für sekundäre Tabellen innerhalb einer Karte (Ausgabenlisten, Import-Vorschauen):
// keine Fläche, nur ruhige Typografie - der Kartenrahmen liefert die Struktur. Primäre Datentabellen
// (eigener Tabellenrahmen, tableWrapCls) nutzen theadCls.
export const theadQuietCls = "text-xs font-semibold text-[var(--color-text-muted)] uppercase";

// Freigabestatus (Leistungsdokumentation / Abschlussbericht-Entwurf) -> ProsStatusPill-Ton.
export const APPROVAL_TONE = {
  IN_BEARBEITUNG: "stable",
  WARTET_AUF_FREIGABE: "attention",
  FREIGEGEBEN: "active",
  KORREKTUR_ANGEFORDERT: "critical",
} as const;
