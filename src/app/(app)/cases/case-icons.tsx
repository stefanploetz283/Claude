// Echte Icon-Komponente statt Unicode-Glyphe (⚠) - selbes Strichstärke-System (1.8) wie
// interim/interim-icons.tsx und die übrigen App-Icons. Rein visuell, keine Logik.

export function IconWarnTriangle({ className = "" }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3 2 20h20L12 3Z" />
      <line x1="12" y1="9" x2="12" y2="14" />
      <circle cx="12" cy="17" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  );
}
