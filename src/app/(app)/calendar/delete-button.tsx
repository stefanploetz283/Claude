"use client";

import { useTransition } from "react";
import { deleteAppointment } from "./actions";

export function DeleteAppointmentButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (confirm("Termin wirklich löschen?")) startTransition(() => deleteAppointment(id));
      }}
      className="text-[10px] text-[var(--color-danger)] hover:underline disabled:opacity-50"
    >
      Löschen
    </button>
  );
}
