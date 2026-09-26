# PROS Jugendhilfe — Design System

**Geltungsbereich:** Diese Datei ist die dauerhafte visuelle Design-Spezifikation für die
gesamte bestehende PROS-Jugendhilfe-App. Sie betrifft ausschließlich **Design, Layout,
Oberfläche, Responsive Verhalten, Accessibility und Microinteractions**.

Die App ist **funktional bereits fertig und produktiv**. Bestehende Funktionen, Fachlogik,
Prisma-Modelle, Datenstrukturen, API-Aufrufe, Rollenrechte, Authentifizierung, Routing,
Berechnungen und Workflows werden durch dieses Redesign **nicht** neu konzipiert. Das
Design-System wird über die bestehende Anwendung gelegt.

Stand: 2026-09-23. Quellen: [`reference/pros-master-dashboard.png`](reference/pros-master-dashboard.png)
(visuelle Zielwirkung) und [`reference/pros-master-dashboard.html`](reference/pros-master-dashboard.html)
(technische Master-Referenz, CSS Zeilen 122–801).

---

## 1. Design Philosophy

PROS ist: **modern, warm, menschlich, hochwertig, ruhig, professionell, leicht, präzise.**

PROS ist explizit **nicht**:
- klassische Verwaltungssoftware
- Bootstrap-Optik
- sterile Behördenoberfläche
- generisches SaaS-Dashboard
- Glassmorphism
- Neon
- überladene Dashboards
- verspielte Kinder-App

Die Praxis arbeitet mit Kindern und Familien in schwierigen Lebenslagen — die Oberfläche darf
diese Ernsthaftigkeit nicht mit Verwaltungskälte beantworten, aber auch nicht kindlich/verspielt
wirken. Der Zielton ist der einer **hochwertigen, ruhigen Fachpraxis**, nicht der eines
Tech-Startups und nicht der eines Amts.

## 2. Canonical Reference

| Quelle | Rolle |
|---|---|
| `pros-master-dashboard.png` | Visuelle **Gesamtwirkung** — wie es sich anfühlen soll |
| `pros-master-dashboard.html` | Technische **Master-Referenz** — konkrete Maße, Farben, Struktur |
| `PROS-DESIGN-SYSTEM.md` (diese Datei) | App-weite, komponentenübergreifende Regeln |

**Konfliktreihenfolge** (bei Widersprüchen in dieser Reihenfolge auflösen):

1. PNG — Gesamtwirkung
2. HTML — konkrete technische Gestaltung
3. Design-System (diese Datei)
4. vorhandene Shared Components
5. Empfehlungen von Skills

Ein Skill (Taste, Impeccable, Emil, Design Review) darf die visuelle Identität **nicht neu
interpretieren** — Skills setzen um, prüfen und polieren, sie erfinden nicht neu.

## 3. Colors

### 3.1 Bestätigte Kern-Tokens (aus Referenz-`:root`)

```css
--pros-petrol:       #0B3D46;
--pros-petrol-ui:     #174C4D;
--pros-petrol-2:      #1E5B59;

--pros-sage:          #8AA187;
--pros-sage-soft:     #DCE6D7;
--pros-sage-pale:     #EEF2EA;

--pros-gold:          #E3A72C;
--pros-gold-soft:     #F7E6B9;

--pros-cream:         #F7F3EA;
--pros-canvas:        #FDFBF6;
--pros-card:          #FFFCF7;

--pros-text:          #17383C;
--pros-muted:         #6F7E7B;
```

### 3.2 Neu zentralisierte Tokens (bisher literal in der Referenz verstreut)

Diese Werte kamen in der Referenz mehrfach oder als Einzelwert vor, aber **nicht** als
CSS-Variable — hiermit zentralisiert:

```css
/* Sidebar */
--pros-sidebar-grad-1: #164B4C;
--pros-sidebar-grad-2: #0E5153;
--pros-sidebar-grad-3: #115155;

/* Status */
--pros-status-active-bg:    #E2EBD9;
--pros-status-active-text:  #2D5C3C;
--pros-status-attention-bg:   #FFF0C9;
--pros-status-attention-text: #B86F00;
--pros-status-stable-bg:    #E6EFEF;
--pros-status-stable-text:  #285F63;

/* Progress */
--pros-progress-track: #E6EAE4;
--pros-progress-fill:  #135A5B;

/* Divider / Border */
--pros-border-subtle:  rgba(11,61,70,.08);
--pros-border-default: rgba(11,61,70,.09);
--pros-border-strong:  rgba(11,61,70,.10);

/* Meta-Text-Stufen (verschiedene Grautöne in der Referenz, hier vereinheitlicht) */
--pros-meta-1: #566B6C;   /* Zeit/Timeline */
--pros-meta-2: #6C7C7C;   /* Progress-Label */
--pros-meta-3: #718080;   /* Notice-Sub */
--pros-meta-4: #738182;   /* Case-Meta */

/* Error / Critical — einziger Rotwert aus der Referenz (kpi-note.alert) */
--pros-critical-text: #C22F1D;   /* abgedunkelt von #E04C39, Accessibility-Pass s.u. */
--pros-critical-bg:   #FBE3DE;   /* ⚠ extrapoliert, s. Abschnitt "Nicht eindeutig spezifiziert" */
```

**Accessibility-Korrektur (Critical-Text):** Der ursprüngliche Referenzwert `#E04C39` erreichte auf
den realen hellen PROS-Arbeitsflächen (`--pros-card` `#FFFCF7`, `--pros-canvas` `#FDFBF6`,
`--pros-cream` `#F7F3EA`, Weiß) nur 3,6–4,0:1 und unterschritt damit WCAG AA (4,5:1) für normalen
Text. Korrigiert auf `#CC3320` — gleicher Hue/Sättigung (≈7°, ≈73%), nur die HSL-Lightness von
55,1 % auf 46,2 % reduziert. Neue Werte: 4,66:1 (`--pros-cream`, schlechtester Fall), 4,99:1
(`--pros-canvas`), 5,05:1 (`--pros-card`), 5,16:1 (Weiß) — alle ≥ AA. Als Nebeneffekt verbessert
sich auch die umgekehrte Paarung (weißer Text auf `--pros-critical-text`-Fläche, z. B.
Gefahrenzone-Buttons) von zuvor ~4,0:1 auf denselben Wert wie oben.
**Zweite Korrektur (Abschlussblock 1B, Status-Pille):** Critical-Text auf `--pros-critical-bg`
(`#FBE3DE`, die Status-Pill-Fläche) erreichte mit `#CC3320` nur 4,22:1. `ProsStatusPill tone="critical"`
wird real verwendet (Cockpit-Ampel, Forderungen, Freigabestatus "Korrektur angefordert"), daher wurde
`--pros-critical-text` ein zweites Mal minimal abgedunkelt: **`#C22F1D`** (gleicher Hue, Lightness
≈ 45 %). Neue Werte: 4,61:1 auf `--pros-critical-bg`, 4,59:1 auf `--color-coral-soft`, 5,1:1 auf
`--pros-cream` (dunkelste Arbeitsfläche), weiter ≥ 5:1 auf Canvas/Card/Weiß. Keine neue Farbe, keine
Änderung der Fläche. Die Werte in den Abschnitten oben (4,66 / 4,99 / 5,05 / 5,16:1) gelten für den
Zwischenstand `#CC3320` und sind durch die zweite Abdunklung nur besser geworden.

### 3.3 Shadow-Tokens

```css
--pros-shadow:        0 10px 28px rgba(11,61,70,.055);
--pros-shadow-hover:  0 14px 34px rgba(11,61,70,.085);
```

Siehe Abschnitt 8 für weitere Elevation-Ebenen.

**Regel:** Keine verstreuten Hex-Werte mehr in Komponenten, wenn dafür oben ein Token existiert.
Neue Farben nur ergänzen, wenn wirklich kein passender Token existiert — und dann hier eintragen.

## 4. Color Usage Rules

**PETROL** = Struktur, Navigation, Headlines, starke UI-Elemente.
Trägt die App zusammen: Sidebar, aktive Zustände, große Überschriften, primäre Textfarbe.

**SALBEI** = sichtbare sekundäre UI-Farbe — **kein** kleiner Nebenakzent, sondern durchgängig
sichtbar in:
- Suchfeldern (Sidebar-Suche ist vollflächig Salbei-getönt, nicht neutral-grau)
- Iconflächen (Icon-Kreise auf KPI, Timeline, Quick-Actions)
- KPI-Flächen (primäre KPI-Kachel nutzt Salbei-Gradient)
- Hover-States (z. B. Quick-Action-Hover wird Salbei-pale)
- sekundären Buttons
- Statusflächen (Active-Status nutzt Salbei-Familie)
- Selected States
- ruhigen Informationsflächen (Panels, Listen-Hintergründe)

**GOLD** = sparsame Aufmerksamkeit. Niemals großflächige Primärfarbe. Einsatz nur für:
Handschrift-Akzente, kleine Unterstreichungs-Striche, Fokusring, einzelne Notice-Icons,
Benachrichtigungs-Punkt, seltene Hervorhebungen in Timeline/Kalender.

### 4.1 Brand-Color-Contrast-Matrix (verbindlich)

Verbindliche Vordergrund-/Hintergrund-Matrix für die acht PROS-Markenfarben, berechnet nach der
WCAG-2.1-Kontrastformel (mind. AA für normalen Text: 4,5:1; großer/fetter Text ab ~18,7px oder
grafische Objekte/Icons: 3:1). „Dunkler Text" = `--color-text` (`#2E3330`). Werte gerundet.

| Hintergrund | + Weiß | + Petrol | + dunkler Text | + Gold |
|---|---|---|---|---|
| **Petrol** `#0B3D46` | 11,9 ✅ | — (gleiche Familie) | — (gleiche Familie) | 5,6 ✅ |
| **Salbei** `#8AA187` | 2,8 ❌ | 4,25 ⚠️ (nur groß/Icon) | 4,6 ✅ (knapp) | 1,3 ❌ |
| **Salbei Soft** `#DCE6D7` | 1,3 ❌ | 9,2 ✅ | 10,0 ✅ | 1,7 ❌ |
| **Salbei Pale** `#EEF2EA` | 1,1 ❌ | 10,5 ✅ | 11,4 ✅ | 1,9 ❌ |
| **Gold** `#E3A72C` | 2,1 ❌ | 5,6 ✅ | 6,0 ✅ | — (gleiche Familie) |
| **Gold Soft** `#F7E6B9` | 1,2 ❌ | 9,6 ✅ | 10,4 ✅ | 1,7 ❌ |
| **Warmweiß/Card** `#FEFCF6` | 1,0 ❌ | 11,6 ✅ | 12,5 ✅ | 2,1 ❌ |
| **Weiß** `#FFFFFF` | — (gleiche Familie) | 11,9 ✅ | 12,9 ✅ | 2,1 ❌ |

**Ableitung:**
- **Weiß als Vordergrund funktioniert nur auf Petrol.** Auf allen anderen sieben Flächen
  (inkl. Gold und Salbei) unterschreitet Weiß WCAG AA — Weiß ist **ausschließlich** für Text/Icons
  auf Petrol-Flächen zulässig.
- **Petrol als Vordergrund funktioniert auf allen hellen/weichen Flächen** (Salbei Soft, Salbei
  Pale, Gold, Gold Soft, Warmweiß/Card, Weiß) mit großem Sicherheitsabstand. Auf **rohem,
  gesättigtem Salbei** liegt Petrol bei 4,25:1 und **unterschreitet knapp** die 4,5:1-Schwelle für
  normalen Text — auf rohem Salbei-Hintergrund nur für großen/fetten Text (≥ 18,7px) oder reine
  Icons (3:1-Schwelle) verwenden, für normalen Fließtext auf rohem Salbei stattdessen dunklen Text.
- **Dunkler Text funktioniert auf allen hellen/weichen Flächen sowie (knapp, 4,6:1) auf rohem
  Salbei.** Das ist die sichere Wahl für Text auf rohem, gesättigtem Salbei-Hintergrund.
- **Gold als Vordergrund funktioniert nur auf Petrol.** Gold-Text auf jeder hellen Fläche (Salbei
  Soft/Pale, Gold Soft, Warmweiß, Weiß) liegt zwischen 1,1 und 1,9:1 und ist **immer unzulässig**.
- **Gold und Salbei als Hintergrund sind niemals mit Weiß kombinierbar** — dort ausschließlich
  Petrol bzw. dunkler Text verwenden.

**Kurzregel:** *Weiß nur auf Petrol. Gold nur auf Petrol. Petrol/dunkler Text überall sonst.*

**WARMWEISS** (`--pros-canvas` / `--pros-card`) = primärer Arbeitsraum. Der Großteil der
Fläche ist warmes Cremeweiß, nicht Petrol und nicht Salbei — die Farben setzen Akzente auf
einem ruhigen hellen Grund.

## 5. Typography

Drei Schriftfamilien, funktional strikt getrennt:

| Rolle | Font | Einsatz |
|---|---|---|
| UI / Body | **Manrope** | Gesamte Arbeitsoberfläche: Navigation, Formulare, Fachinformationen, Tabellen |
| Emotional / Handschrift | **Caveat** | Ausschließlich Begrüßung und Signatur-Slogan — **nie** für Navigation, Formulare oder Fachinformationen |
| Display / Hero | **DM Serif Display** | Großer Account-Name im Hero, Hero-Zitat |

### Skala

| Stil | Font | Größe | Gewicht | Line-height | Letter-spacing | Quelle |
|---|---|---|---|---|---|---|
| Display | DM Serif Display | 72px | 400 | 0.98 | -0.02em | direkt (`.user-title`) |
| Quote | DM Serif Display, italic | 24px | 400 | 1.18 | normal | direkt (`.hero-quote`) |
| Script | Caveat | 22–38px (kontextabhängig) | 400 | 1.0–1.05 | normal, `rotate(-5deg)` | direkt (`.hello`, `.sidebar-slogan`, `.bottom-slogan`) |
| H1 | Manrope | 30px | 700 | 1.0 | normal | direkt (`.kpi-number`) |
| H2 | Manrope | 19px | 700 | 1.2 | -0.015em | direkt (`.panel h2`) |
| H3 | Manrope | 15px | 700 | 1.3 | normal | ⚠ extrapoliert (kein H3 in Referenz) |
| Body | Manrope | 14px | 400 / 700 | 1.45 | normal | direkt (`.event-title`, `.case-name`) |
| Small | Manrope | 12px | 400 | 1.4 | normal | direkt (`.event-sub`, `.notice-sub`, `.task`) |
| Meta | Manrope | 10–11px | 500 | 1.3 | normal | direkt (`.side-label`, `.kbd`) |
| Label | Manrope | 11px | 600 | 1.2 | 0.01em | direkt (`.status`) |
| Button | Manrope | 13–14px | 600 | 1.0 | normal | ⚠ extrapoliert aus `.calendar-btn`/`.quick` (kein expliziter Button-Text-Stil in Referenz) |
| Table | Manrope | 13px | 400 / 500 | 1.4 | normal | ⚠ extrapoliert — Referenz enthält keine `<table>` |
| Badge | Manrope | 11px | 600 | 1.0 | 0.02em | direkt (identisch mit `.status`-Pill) |

**Regel:** Caveat ist ausschließlich für die zwei emotionalen Markenelemente (Begrüßung,
Signatur) reserviert. Jede weitere Verwendung ist ein Verstoß gegen die Designsprache.

### Seitentitel (App-H1-Standard)

Jede Arbeitsseite der App trägt genau einen `<h1>` in **Manrope 24px (`text-2xl`) / 600 /
`tracking-tight` / `--color-primary`** (Konstante `pageTitleCls` in `cases/case-ui.ts`), optional mit
einem Untertitel darunter (`pageSubtitleCls`: 14px, `--color-text-muted`). Ausnahmen sind bewusst und
abschließend: der Hero-Name auf `/heute` (DM Serif Display, Abschnitt 5 „Display") sowie die
Auth-Seiten `/login` und `/login/verify` (DM Serif Display 38 / 32px, Marken-Typografie außerhalb
des App-Shells). Abschnitts-Überschriften in Karten sind `h2` (`ProsSectionCard`, 19px) bzw. `text-sm
font-semibold` in Formularkarten - niemals ein zweiter `h1`.

## 6. Spacing System

Rohwerte aus der Referenz: `12, 14, 15, 16, 17, 18, 20, 22, 24, 28, 30, 38px` — liegen **nicht**
auf einem sauberen Raster. Für die App-weite Umsetzung gilt ab jetzt ein bereinigtes,
bewusstes Token-System; krumme Werte wie 15/17/18px werden **nicht** 1:1 übernommen, sondern
auf den nächstliegenden Token gerundet.

```css
--space-xs:  8px;   /* enge Innenabstände, Icon-zu-Text-Gaps */
--space-sm:  12px;  /* Task-/Notice-Zeilen, kleine Card-Gaps */
--space-md:  16px;  /* Standard-Gutter: --gap, Workspace, Panels, Quick-Grid */
--space-lg:  20px;  /* KPI horizontal padding, größere Card-Innenabstände */
--space-xl:  28px;  /* .main horizontales Padding */
--space-2xl: 38px;  /* Hero-Gap — bewusste Ausnahme für die große Geste des Hero */
```

**Dokumentierte Ausnahmen** (Referenzwert weicht vom nächsten Token ab, aber bewusst belassen,
weil visuell wirksam):
- `.main`-Padding ist asymmetrisch (`20 28 26 30px`) — Redesign übernimmt die Asymmetrie nicht
  1:1, sondern rundet auf `--space-lg` oben, `--space-xl` seitlich/unten.
- KPI-Padding `17px 20px` → `--space-lg` (20px) horizontal, vertikal auf `--space-md`+2px
  gerundet — visuelle Differenz vernachlässigbar.
- Case-Card-Padding `11px 10px` → `--space-sm` (12px), leichte Verdichtung akzeptiert.

## 7. Radius System

```css
--r-sm:  10px;   /* Buttons, Inputs, kleine Controls, Badges-Container */
--r-md:  16px;   /* Cards, Panels, Modals (Basis) */
--r-lg:  22px;   /* größere Flächen, Drawer */
--r-xl:  32px;   /* große weiche Flächen, Feature-Blöcke */
--r-pill: 999px; /* Status-Pills, Progress-Bar, voll gerundete Elemente */
--r-hero: 48px 0 0 48px; /* NUR Hero-Media auf Desktop — Sonderfall, kein wiederverwendbares Token */
```

| Komponente | Radius |
|---|---|
| Input / TextField / Button | `--r-sm` |
| Card / Panel / Modal | `--r-md` |
| Drawer | `--r-lg` |
| Badge / Status-Pill / Progress-Bar | `--r-pill` |
| Profile-Avatar / Case-Avatar / Icon-Circle | `50%` (Kreis) |
| Hero-Media (Desktop) | `--r-hero` (48px 0 0 48px) — einseitig, kein Blob/Clip-Path |

**Regel:** Nicht jede Komponente bekommt einen beliebig eigenen Radius. Referenzwerte, die
knapp neben einem Token liegen (13px Nav-Item, 14px Sidebar-Suche, 15px Case-Card, 12px
Quick-Action), werden im Redesign konsequent auf `--r-sm` oder `--r-md` vereinheitlicht statt
die krummen Einzelwerte fortzuschreiben.

## 8. Elevation / Shadows

```css
--shadow-default: 0 10px 28px rgba(11,61,70,.055);
--shadow-hover:   0 14px 34px rgba(11,61,70,.085);
--shadow-popover: 0 18px 52px rgba(5,38,43,.18);   /* direkt aus .profile-menu */
--shadow-modal:   0 24px 64px rgba(5,38,43,.22);    /* ⚠ extrapoliert, eine Stufe über Popover */
--shadow-drawer:  0 20px 56px rgba(5,38,43,.16);    /* ⚠ extrapoliert */
--shadow-gold:    0 4px 10px rgba(227,167,44,.22);  /* direkt aus .notice-icon, für gold-akzentuierte Elemente */
```

**Regel:** Schatten bleiben immer weich und petrol- bzw. gold-getönt (nie neutral-schwarz,
nie hart). Standard/Hover sind die einzigen Ebenen für alltägliche Karten; Popover/Modal/Drawer
bekommen eigene, etwas kräftigere Ebenen für ihre höhere Elevation.

## 9. Borders

```css
--border-subtle:  rgba(11,61,70,.08);   /* Case-Card */
--border-default: rgba(11,61,70,.09);   /* Listen-Trennlinien (Task, Notice, Timeline-Event) */
--border-strong:  rgba(11,61,70,.10);   /* Cards, Panels — Standard-Kartenrand */
```

Alle drei sind derselbe Grundfarbe (Petrol) in steigender Opazität — bewusst kein hartes
Schwarz/Grau. Trennung erfolgt primär durch Raum und Tonwert, nicht durch kräftige Linien.

## 10. App Shell

**Desktop Sidebar:** 230px · **≤1280px:** 204px · **≤1023px:** 86px Icon-Rail · **≤767px:**
mobile Topbar (horizontal, Navigation eingeklappt/als Menü).

**Sidebar-Farbe:** vollflächig Petrol-Gradient (`--pros-sidebar-grad-1/2/3`) — **niemals**
Schwarz oder Anthrazit.

**Sidebar-Suche:** sichtbar Salbei-getönt, nicht neutral-grau (siehe Abschnitt 4).

**Active Nav-Item:** Warmweiß-Hintergrund (`--pros-canvas`), Petrol-Text/Icon, weicher Radius
(`--r-sm`/`--r-md`-Bereich, konkret 13px in Referenz → auf `--r-sm` vereinheitlichen), leichte
Elevation (`box-shadow: 0 6px 16px rgba(3,32,37,.10)`).

## 11. Card System

| Card-Typ | Zweck |
|---|---|
| **Base Card** | generische Grundfläche, Basis aller anderen |
| **Section Card** | Panel mit Header + "Alle anzeigen"-Link (Timeline, Fälle, Aufgaben, Hinweise) |
| **KPI Card** | Kennzahl mit Icon-Kreis, Zahl, Label, optionalem Trend; `primary`-Variante mit Salbei-Gradient-Hintergrund |
| **Case Card** | Fall-Kachel mit Avatar, Status-Pill, Fortschrittsbalken |
| **Action Card** | Quick-Action-Kachel (Icon-Kreis + Label) |
| **Notice Card** | Hinweis-Zeile mit farbigem Icon-Kreis |

**Gemeinsamer Standard:** Warmweiß (`--pros-card`), 1px `--border-strong`, `--shadow-default`,
`--r-md` (16px) Radius.

**Hover (wo interaktiv):** maximal 1–2px Lift (`translateY(-1px)` bis `-2px`) kombiniert mit
`--shadow-hover`. Kein Scale, kein Zoom.

## 12. Status System

Referenz definiert direkt: **Active, Attention, Stable.** Für ein vollständiges System werden
vier weitere Zustände ergänzt (⚠ extrapoliert, an bestehende Tonalität angelehnt):

| Status | Fläche | Text/Icon | Quelle |
|---|---|---|---|
| Active | `#E2EBD9` | `#2D5C3C` | direkt |
| Stable | `#E6EFEF` | `#285F63` | direkt |
| Attention | `#FFF0C9` | `#B86F00` | direkt |
| Critical | `--pros-critical-bg` `#FBE3DE` | `--pros-critical-text` `#C22F1D` | Text direkt (`.kpi-note.alert`), Fläche ⚠ extrapoliert; Text abgedunkelt von `#E04C39` im Accessibility-Pass, s. Abschnitt 3.2 |
| Info | `#E6EFEF` (wie Stable, petrol-neutral) | `#285F63` | ⚠ extrapoliert, teilt sich Ton mit Stable |
| Paused | `--pros-sage-pale` `#EEF2EA` | `--pros-muted` `#6F7E7B` | ⚠ extrapoliert |
| Archived | `#E2E0D8` | `#756F60` | ⚠ extrapoliert, bewusst entsättigt; in der Interim-Umsetzung gegenüber der ersten Fassung (`#EDEDE8`/`#8A8A82`) abgedunkelt, weil der Kontrast auf den warmweißen Cards (`--color-surface: #fefcf6`) sonst zu gering war |

**Regel:** Keine grellen Ampelfarben. Critical nutzt gedecktes Terrakotta/Rot, nie reines
Signalrot. Statusflächen sind grundsätzlich hell, Text/Icon dunkler und kräftiger als die
Fläche.

## 13. Icons

Einheitliches Outline-Icon-System (`stroke: currentColor; fill: none; stroke-width: 1.8;
stroke-linecap/linejoin: round`) — keine Mischung mit gefüllten oder unterschiedlichen
Icon-Stilen.

| Größe | Wert | Einsatz | Quelle |
|---|---|---|---|
| Standard | 22px | Navigation, Suchfeld, allgemeine UI-Icons | direkt (`.icon`) |
| Klein | 16px | inline in Text, dichte Tabellen | ⚠ extrapoliert |
| Icon-Circle groß | 56–58px | KPI-Icons | direkt (`.kpi-icon`) |
| Icon-Circle mittel | 40–44px | Timeline-Event, Quick-Action | direkt (`.event-icon`, `.quick-icon`) |
| Icon-Circle klein | 38px | Notice | direkt (`.notice-icon`) |

Icon-Circles nutzen durchgängig die Salbei-/Warmweiß-Sprache aus Abschnitt 4 (Standard:
Salbei-Tint-Hintergrund, Petrol-Icon; Gold nur für Notice-Icons mit Aufmerksamkeitscharakter).

## 14. Forms

⚠ Die Referenz enthält konkret nur das Sidebar-Suchfeld. Alle übrigen Formularelemente sind
aus den Tokens abgeleitet, nicht direkt aus der Referenz übernommen.

**Grundhaltung:** ruhig, warm, klar, großzügig, deutlicher Fokus-Zustand. Keine
Standard-Browser-Optik, kein Bootstrap.

| Element | Regel |
|---|---|
| TextField / Textarea | `--pros-card`-Hintergrund, 1px `--border-strong`, `--r-sm` Radius, Innenabstand `--space-sm`/`--space-md`, Platzhalter in `--pros-muted` |
| Search | Salbei-getönter Hintergrund (analog Sidebar-Suche), `--r-sm`, mit optionalem `⌘K`-Kbd-Hinweis |
| Select | wie TextField, Chevron-Icon in Petrol |
| Checkbox | quadratisch, `--r-xs`-artig (4px, direkt aus `.checkbox`), Border `#8EA09D`, done-State Petrol-Fill (`#14595A`) |
| Radio | rund, gleiche Border-/Fill-Logik wie Checkbox |
| Switch | Salbei/Petrol als "an"-Zustand statt Gold (Gold bleibt Akzent, kein Statusträger) |
| DatePicker | Kalenderfläche in Warmweiß, aktiver Tag in Petrol-Fill, Hover Salbei-pale |
| File Upload | Dropzone in `--pros-sage-pale`, gestrichelter `--border-default`-Rand |

**Focus Ring (verbindlich, alle Formularelemente):** genau *ein* Fokusindikator - der goldene Ring
unten (global in `globals.css`, mit transparenter Ausgangsfarbe, damit Transitions ihn einblenden statt
in der Textfarbe aufblitzen zu lassen). Lokale `focus:ring-*`-Klassen sind nicht zulässig; die
Rahmenfarbe eines Feldes darf im Fokus zu `--color-primary` wechseln, das ist kein zweiter Ring.
```css
outline: 3px solid rgba(227,167,44,.55);
outline-offset: 2px;
```
Direkt aus Referenz übernommen, App-weit für alle interaktiven Elemente.

## 15. Data Tables / Lists

⚠ Die Referenz enthält keine `<table>`-Struktur (nur Card-/Listen-Muster) — diese Sektion ist
aus der vorhandenen Card-/List-Sprache abgeleitet, nicht direkt aus der Referenz übernommen.

Grundsatz: keine harte Excel-/ERP-Optik, trotzdem hohe Informationsdichte für die
Fachbereiche (z. B. Finanzen, Zeit-Kapazität), die echte Tabellen brauchen.

- Viel Weißraum statt enger Zeilenhöhe
- Subtile Row-Divider (`--border-default`, keine harten Tabellenlinien)
- Weiche Hover-Fläche pro Zeile (`--pros-sage-pale`)
- Klare Typohierarchie: Body für Primärwert, Small/Meta für Sekundärinfo
- Status-Pills statt Text für Zustände
- Ruhige Filterleiste oberhalb der Tabelle, gleiche Card-Sprache wie restliche Panels

### 15.1 Tabellenkopf-Standard (verbindlich)

| Tabellentyp | Konstante (`cases/case-ui.ts`) | Aussehen |
|---|---|---|
| **Primäre Datentabelle** - eigener Rahmen (`tableWrapCls`: `--r-md`, `--border-strong`, `--shadow-default`, `overflow-x-auto`) | `theadCls` | Fläche `--color-primary-soft`, Text `--color-primary` (≈ 9:1), 11px / 700 / `tracking-wide` / GROSSBUCHSTABEN; Zeilen mit `--border-default`-Divider und `--pros-sage-pale`/40 als Hover (`trCls`) |
| **Sekundäre Tabelle** - in einer Karte neben anderem Inhalt (Ausgabenlisten, Import-Vorschauen, verschachtelte Listen) | `theadQuietCls` | keine Fläche, 12px / 600 / GROSSBUCHSTABEN, `--color-text-muted`; der Kartenrahmen liefert die Struktur |

Regeln: `<th scope="col">`, sortierbare Spalten zusätzlich `aria-sort`; Zahlen/Zeiten `tabular-nums`;
Zeilenaktionen als Textlinks (`linkActionCls` / `linkDangerCls`), Status als `ProsStatusPill`. Neue
Tabellen wählen einen der beiden Typen - keine eigenen Kopf-Varianten.

### 15.2 Status-Chips

Zustände (Freigabe, Aktiv/Archiviert, Ampel, Zugriffsaktion) werden mit `ProsStatusPill` dargestellt.
Nicht migriert werden **kategoriale** Kennzeichnungen (Rollen-, Kapitel-, Tag-Chips), **Händler-/
Markenfarben** (Gutschein-Anbieter) und **Zähler-Badges**. `critical` bleibt echten Fehler-/
Korrekturzuständen vorbehalten und ist keine allgemeine Akzentfarbe.

## 16. Modal / Drawer / Popover

⚠ Referenz enthält konkret nur das Profil-Dropdown (`.profile-menu`) als Muster für diese
Kategorie. Modal/Drawer sind davon abgeleitet, nicht direkt referenziert.

| Element | Basis |
|---|---|
| Popover / Dropdown / Profile Menu | direkt: `--pros-card`, `--r-md`, `--shadow-popover`, Innenabstand 8px, Eintritts-Animation `menuIn` (`opacity 0→1`, `translateY(8px) scale(.985) → none`, 170ms `--ease`) |
| Tooltip | ⚠ extrapoliert: Petrol-Hintergrund, Warmweiß-Text, `--r-sm`, kein Schatten-Overkill, kurze Fade-Animation |
| Modal | ⚠ extrapoliert: `--r-lg`, `--shadow-modal`, zentriert, Overlay in `rgba(11,61,70,.35)` |
| Drawer | ⚠ extrapoliert: `--r-lg` nur auf der zum Content zeigenden Seite, `--shadow-drawer`, seitlicher Slide-in |

**Regel:** gleiche Tokens wie der Rest der App, gleiche weiche Animationslogik (170–220ms,
`--ease`), keine fremde Designsprache (kein Bootstrap-Modal-Look, kein hartes Drop-Shadow).

## 17. Motion

```css
--motion-duration: 170ms;      /* Default, zulässiger Bereich 160–220ms */
--motion-ease: cubic-bezier(.22,.61,.36,1);
```

- Hover: maximal `translateY(-2px)`
- Nav-Hover: maximal `translateX(2px)`
- Kein Bounce, kein unnötiger Scale, keine verspielten Springs
- `prefers-reduced-motion: reduce` wird global respektiert — alle Transitions/Animationen
  deaktiviert (direkt aus Referenz übernommen)

## 18. Responsive

**Desktop-Master:** 1536×1024 (Referenz-Viewport).

**Breakpoints (aus Referenz-CSS):**
- `≤1280px` — Sidebar 204px, Hero-Grid 360px/1fr, KPI-Grid bleibt 4-spaltig, Right-Stack wird 2-spaltig
- `≤1023px` — Sidebar 86px Icon-Rail, Hero einspaltig, KPI-Grid 2-spaltig, Workspace einspaltig
- `≤767px` — Sidebar wird horizontale Topbar, KPI-Grid 1-spaltig, Case-Side ausgeblendet

**Zusätzliche QA-Viewports:** 1280×800, 1024×768, 768×1024, 375×812.

**Regel:** Responsive darf das Layout verändern (Spaltenzahl, Sichtbarkeit einzelner
Detailelemente), aber niemals die Designsprache (Farben, Typografie-Rollen, Radius-/Schatten-
Logik bleiben über alle Breakpoints identisch).

## 19. Photography

Hero-Fotografie ist Teil der Designsprache — aber **das konkrete Kinderfoto aus der Referenz
ist nicht produktionsfreigegeben.** Produktiv dürfen nur ausdrücklich freigegebene Assets
verwendet werden; bis dahin gilt die bestehende datenschutzsichere Platzhalterlösung.

**Fotoregel für zukünftige freigegebene Assets:**
- warm, dokumentarisch, menschlich, ruhig
- nicht stock-artig, nicht werblich
- Motiv bevorzugt rechts positioniert, Textbereich links frei
- dezentes Petrol-/Salbei-Overlay (siehe `.hero-media::after`-Gradient in der Referenz)

## 20. Shared Components

Zielarchitektur der komponentenweiten Umsetzung (Dokumentation der Designsprache je
Komponente — **noch nicht implementiert**):

**Direkt aus Referenz ableitbar** (CSS existiert bereits konkret):
AppShell, Sidebar, SidebarSearch, NavItem, ProfileChip, ProfileMenu, HeroBanner, Card,
SectionCard, KpiCard, Timeline, TimelineRow, CaseCard, ProgressBar, StatusPill, TaskRow,
NoticeRow, QuickAction.

**Nur konzeptionell benannt, aus Tokens neu abzuleiten** (kein Referenz-CSS vorhanden):
Button, IconButton, Input, Textarea, Select, Checkbox, Switch, DatePicker, Tabs,
SegmentedControl, Drawer, Modal, Popover, Dropdown, Tooltip, Toast, Alert, Banner,
EmptyState, LoadingState, Skeleton, ErrorState, Table, FilterBar, Pagination, FileUpload,
DocumentCard.

Für die zweite Gruppe gelten die Regeln aus Abschnitt 14–16 als Ausgangspunkt; sie sind
konsistent mit den Tokens zu bauen, sobald sie tatsächlich implementiert werden.

## 21. Accessibility

Accessibility ist Bestandteil des Designs, kein nachträglicher Zusatz:

- **focus-visible:** global `outline: 3px solid rgba(227,167,44,.55); outline-offset: 2px;` auf allen interaktiven Elementen (direkt aus Referenz)
- **Keyboard Navigation:** komplette Sidebar, alle Cards/Buttons/Formulare müssen ohne Maus bedienbar sein
- **ARIA:** Sidebar trägt `aria-label="Hauptnavigation"` (direkt aus Referenz-Markup), Icons dekorativ (`aria-hidden`) wenn begleitender Text vorhanden ist
- **Kontrast:** Textfarben (`--pros-text` auf `--pros-canvas`/`--pros-card`) erfüllen WCAG AA; Status-Text-Farben sind bewusst dunkler als ihre Flächen gewählt
- **Reduced Motion:** `prefers-reduced-motion: reduce` deaktiviert global alle Transitions/Animationen (direkt aus Referenz)
- **Touch Targets:** Nav-Items/Buttons mindestens 44–48px Höhe (direkt aus Referenz, `.nav-item`/`.sidebar-search` = 48px)
- **Alt-Texte:** für alle produktiven Fotos/Avatare verpflichtend; Platzhalter-SVGs erhalten beschreibenden Alt-Text statt leerem Alt

## 22. Skill Workflow

Verbindliche Reihenfolge bei der Umsetzung:

1. **Taste (`/image-to-code`)** — visuelle Rekonstruktion, Screenshot/HTML strukturell exakt übertragen
2. **Impeccable** — UI-Qualität, Konsistenz, Hierarchie, Accessibility, States, Edge Cases
3. **Emil Design Engineering** — Motion und Microinteractions polieren
4. **Playwright** — realer Browser, Screenshots, Interaktionstest
5. **Design Review** — visuelle QA gegen die Referenz

**Regel:** Referenz schlägt Skill-Geschmack (*Reference > Skill Taste*). Kein Skill darf die
hier dokumentierte visuelle Identität neu interpretieren, modernisieren oder vereinfachen.

## 23. Visual QA Contract

Nach jedem größeren UI-Redesign-Schritt:

1. Playwright-Screenshot bei **1536×1024**
2. Vergleich mit `pros-master-dashboard.png`
3. Prüfen: Layout, Spacing, Typografie, Farben, Salbei/Petrol/Gold-Balance, Radius, Schatten,
   Borders, Icons, Alignment, Whitespace, Hierarchie
4. Abweichungen beheben, erneut rendern
5. Danach Responsive-QA über die Breakpoints/Viewports aus Abschnitt 18

## 24. Golden Rule

> **THE APPLICATION IS ALREADY FUNCTIONAL.**
> **DO NOT REDESIGN THE PRODUCT.**
> **REDESIGN THE PRESENTATION OF THE EXISTING PRODUCT.**
