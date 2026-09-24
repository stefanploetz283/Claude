// Reiner Inhaltsbereich - alle Navigation (primär + kontextuelle Unterpunkte) liegt jetzt in der
// einen durchgehenden AppSidebar, deshalb keine Routen-Fallunterscheidung mehr nötig.
export function AppBody({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-w-0 flex-1 overflow-y-auto p-[20px_20px_26px_20px] sm:p-[20px_28px_26px_30px]">
      <main className="mx-auto flex max-w-[1400px] min-w-0 flex-col gap-6">{children}</main>
    </div>
  );
}
