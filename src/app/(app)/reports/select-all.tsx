"use client";

export function SelectAllCheckbox() {
  return (
    <label className="flex items-center gap-2 font-medium">
      <input
        type="checkbox"
        onChange={(e) => {
          document.querySelectorAll<HTMLInputElement>(".case-checkbox").forEach((cb) => {
            cb.checked = e.target.checked;
          });
        }}
      />
      Alle auswählen
    </label>
  );
}
