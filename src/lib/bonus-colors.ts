// Platzhalter-Farben für das Bonus-Cockpit - noch nicht final als Marken-/Logofarbe bestätigt
// (siehe Feature-Vorgabe). An einer Stelle gesammelt, damit ein späterer Austausch einfach bleibt.
export const BONUS_PRIMARY = "#0F6E56";
export const BONUS_LIGHT = "#E1F5EE";
export const BONUS_DARK_TEXT = "#085041";

export const GUTSCHEIN_STYLES = {
  EDEKA: { label: "Edeka", sparte: "Lebensmittel", bg: "#FFCB05", text: "#3D2B00", subtitle: "#6B4F00" },
  DM: { label: "dm", sparte: "Drogerie", bg: "#185FA5", text: "#FFFFFF", subtitle: "#B5D4F4" },
  MEDIAMARKT: { label: "MediaMarkt", sparte: "Elektronik", bg: "#A32D2D", text: "#FFFFFF", subtitle: "#F7C1C1" },
} as const;

export type GutscheinAnbieterKey = keyof typeof GUTSCHEIN_STYLES;
