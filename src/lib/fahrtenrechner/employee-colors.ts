// Feste Palette für die Fall-Marker-Einfärbung nach Mitarbeiter auf der Cluster-Karte -
// deterministisch nach Reihenfolge, damit derselbe Mitarbeiter bei jedem Seitenaufruf dieselbe Farbe behält.
const PALETTE = [
  "#204d4b", // primary
  "#d2ad69", // gold
  "#9fa47e", // sage
  "#d65a3a", // coral
  "#3f7a77",
  "#8a5a12",
  "#5c635e",
  "#7a8a6a",
  "#b8863f",
  "#4a6a68",
];

export function employeeColor(index: number): string {
  return PALETTE[index % PALETTE.length];
}
