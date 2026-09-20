// Reiner Inhaltsbereich - alle Navigation (primär + kontextuelle Unterpunkte) liegt jetzt in der
// einen durchgehenden AppSidebar, deshalb keine Routen-Fallunterscheidung mehr nötig.
export function AppBody({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-w-0 flex-1 overflow-y-auto px-5 py-8">
      <main className="mx-auto flex max-w-[1400px] min-w-0 flex-col gap-6">{children}</main>
    </div>
  );
}
