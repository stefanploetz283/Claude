// Farben des Bonus-Bereichs. BONUS_PRIMARY war ein Platzhalter (rein dekorativ, keine fachliche Bedeutung) und
// folgt jetzt dem PROS-Fortschrittston; die frühere mintgrüne Flächen-/Textfarbe ist entfallen. Die Gutschein-
// Anbieterfarben sind dagegen die Markenidentität der jeweiligen Händler und bleiben bewusst unverändert.
export const BONUS_PRIMARY = "var(--pros-progress-fill)";

export const GUTSCHEIN_STYLES = {
  EDEKA: { label: "Edeka", sparte: "Lebensmittel", bg: "#FFCB05", text: "#3D2B00", subtitle: "#6B4F00" },
  DM: { label: "dm", sparte: "Drogerie", bg: "#185FA5", text: "#FFFFFF", subtitle: "#B5D4F4" },
  MEDIAMARKT: { label: "MediaMarkt", sparte: "Elektronik", bg: "#A32D2D", text: "#FFFFFF", subtitle: "#F7C1C1" },
} as const;

export type GutscheinAnbieterKey = keyof typeof GUTSCHEIN_STYLES;
