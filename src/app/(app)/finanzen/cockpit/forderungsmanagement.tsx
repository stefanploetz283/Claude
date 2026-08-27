"use client";

import { useTransition } from "react";
import { markInvoiceAsBezahlt } from "./steuer-actions";

const cardCls = "rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-soft)]";

export type OffeneRechnung = {
  id: string;
  number: string;
  clientName: string;
  totalAmount: number;
  issuedAt: string;
  tageOffen: number;
};

function alterAmpelCls(tageOffen: number): string {
  if (tageOffen > 60) return "bg-[var(--color-coral-soft)] text-[var(--color-coral)]";
  if (tageOffen > 30) return "bg-[var(--color-warn-soft)] text-[var(--color-warn-text)]";
  return "bg-[var(--color-primary-soft)] text-[var(--color-primary)]";
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
    <tr className="border-t border-[var(--color-border)]">
      <td className="py-2 pr-3 text-[var(--color-text)]">{rechnung.number}</td>
      <td className="py-2 pr-3 text-[var(--color-text)]">{rechnung.clientName}</td>
      <td className="py-2 pr-3 text-right text-[var(--color-text)]">{rechnung.totalAmount.toLocaleString("de-DE", { style: "currency", currency: "EUR" })}</td>
      <td className="py-2 pr-3 text-right">
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${alterAmpelCls(rechnung.tageOffen)}`}>{rechnung.tageOffen} Tage</span>
      </td>
      <td className="py-2 pr-3 text-right">
        <button
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await markInvoiceAsBezahlt(rechnung.id);
            })
          }
          className="rounded-[var(--radius-control)] border border-[var(--color-primary)] px-3 py-1.5 text-xs font-semibold text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white disabled:opacity-50"
        >
          Als bezahlt markieren
        </button>
      </td>
    </tr>
  );
}
