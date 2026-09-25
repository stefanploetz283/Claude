"use client";

import { useTransition } from "react";
import { markInvoiceAsBezahlt } from "./steuer-actions";
import { cardCls, buttonOutlineCls } from "@/app/(app)/cases/case-ui";
import { ProsStatusPill } from "@/components/pros/pros-status-pill";

export type OffeneRechnung = {
  id: string;
  number: string;
  clientName: string;
  totalAmount: number;
  issuedAt: string;
  tageOffen: number;
};

function alterAmpelTone(tageOffen: number): "critical" | "attention" | "active" {
  if (tageOffen > 60) return "critical";
  if (tageOffen > 30) return "attention";
  return "active";
}

export function Forderungsmanagement({ rechnungen }: { rechnungen: OffeneRechnung[] }) {
  return (
    <div className={cardCls}>
      <h2 className="mb-1 text-sm font-semibold text-[var(--color-text)]">Forderungsmanagement</h2>
      <p className="mb-3 text-sm text-[var(--color-text-muted)]">Offene Rechnungen, älteste zuerst — kein automatischer Bankabgleich, „bezahlt&quot; wird manuell gesetzt.</p>
      {rechnungen.length === 0 ? (
        <p className="text-sm text-[var(--color-text-muted)]">Keine offenen Rechnungen.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs font-semibold text-[var(--color-text-muted)] uppercase">
              <tr>
                <th className="py-2 pr-3">Rechnung</th>
                <th className="py-2 pr-3">Klient</th>
                <th className="py-2 pr-3 text-right">Betrag</th>
                <th className="py-2 pr-3 text-right">Tage offen</th>
                <th className="py-2 pr-3" />
              </tr>
            </thead>
            <tbody>
              {rechnungen.map((r) => (
                <RechnungRow key={r.id} rechnung={r} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function RechnungRow({ rechnung }: { rechnung: OffeneRechnung }) {
  const [pending, startTransition] = useTransition();
  return (
    <tr className="border-t border-[var(--pros-border-default)] transition-colors hover:bg-[var(--pros-sage-pale)]/40">
      <td className="py-2 pr-3 text-[var(--color-text)]">{rechnung.number}</td>
      <td className="py-2 pr-3 text-[var(--color-text)]">{rechnung.clientName}</td>
      <td className="py-2 pr-3 text-right tabular-nums text-[var(--color-text)]">{rechnung.totalAmount.toLocaleString("de-DE", { style: "currency", currency: "EUR" })}</td>
      <td className="py-2 pr-3 text-right">
        <ProsStatusPill tone={alterAmpelTone(rechnung.tageOffen)}>{rechnung.tageOffen} Tage</ProsStatusPill>
      </td>
      <td className="py-2 pr-3 text-right">
        <button
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await markInvoiceAsBezahlt(rechnung.id);
            })
          }
          className={buttonOutlineCls}
        >
          Als bezahlt markieren
        </button>
      </td>
    </tr>
  );
}
