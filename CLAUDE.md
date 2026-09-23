@AGENTS.md

# PROS UI / DESIGN CONTRACT

Die Anwendung ist funktional bereits produktiv nutzbar. Aktuelle UI-Arbeiten betreffen
ausschließlich Design, Layout, Oberfläche, Responsive Design, Accessibility und
Microinteractions.

Keine Fachlogik, Business-Logik, Datenmodelle, Berechtigungen, APIs, Routing oder
bestehende Workflows dürfen aufgrund eines Redesigns neu konzipiert werden.

**Verbindliche Designquellen:**

1. `design/reference/pros-master-dashboard.png` = visuelle Zielwirkung
2. `design/reference/pros-master-dashboard.html` = technische Master-Referenz
3. `design/PROS-DESIGN-SYSTEM.md` = app-weite Designregeln — **verbindliche
   Design-Spezifikation für alle bestehenden und zukünftigen UI-Bereiche**

**Priorität bei visuellen Entscheidungen:**

PNG > HTML > `design/PROS-DESIGN-SYSTEM.md` > bestehende Shared Components >
Skill-Empfehlungen

Die Skills (`impeccable`, `emil-design-eng`, `taste-skill`, `design-review`) dienen nur
zur Umsetzung und Qualitätskontrolle. Sie dürfen die visuelle Identität nicht neu
interpretieren.

**Verbindlicher UI-Workflow bei größeren Redesigns:**

1. Taste / image-to-code
2. Impeccable
3. Emil Design Engineering
4. Playwright
5. Design Review

Nach größeren UI-Änderungen ist Visual QA verpflichtend.

Desktop-Master: 1536 × 1024
Zusätzliche QA-Viewports: 1280 × 800, 1024 × 768, 768 × 1024, 375 × 812

**Golden Rule:**

THE APPLICATION IS ALREADY FUNCTIONAL.
DO NOT REDESIGN THE PRODUCT.
REDESIGN THE PRESENTATION OF THE EXISTING PRODUCT.
