// Reiner Inhaltsbereich - alle Navigation (primär + kontextuelle Unterpunkte) liegt jetzt in der
// einen durchgehenden AppSidebar, deshalb keine Routen-Fallunterscheidung mehr nötig.
// reserveFabSpace: Platz unter dem Inhalt für den fixierten Diktat-Button-Stapel (GlobalDictateWidget),
// damit rechts unten stehende Aktionen am Seitenende nicht dauerhaft verdeckt werden.
export function AppBody({ children, reserveFabSpace = false }: { children: React.ReactNode; reserveFabSpace?: boolean }) {
  const padding = reserveFabSpace ? "p-[20px_20px_150px_20px] sm:p-[20px_28px_150px_30px]" : "p-[20px_20px_26px_20px] sm:p-[20px_28px_26px_30px]";
  return (
    <div className={`min-w-0 flex-1 overflow-y-auto ${padding}`}>
      <main className="mx-auto flex max-w-[1400px] min-w-0 flex-col gap-6">{children}</main>
    </div>
  );
}
