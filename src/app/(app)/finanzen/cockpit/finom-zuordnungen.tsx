"use client";

import { useState, useTransition } from "react";
import { addEmpfaengerZuordnung, deleteEmpfaengerZuordnung, addKategorieMapping, deleteKategorieMapping } from "./csv-import-actions";

const inputCls =
  "rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-1.5 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]";
const KATEGORIEN = [
  { value: "PERSONALKOSTEN", label: "Personalkosten" },
  { value: "RAUMKOSTEN", label: "Raumkosten" },
  { value: "VERWALTUNGSSACHKOSTEN", label: "Verwaltungssachkosten" },
  { value: "SONSTIGE_KOSTEN_AFA", label: "Sonstige Kosten/AfA" },
];
const KATEGORIE_LABEL: Record<string, string> = Object.fromEntries(KATEGORIEN.map((k) => [k.value, k.label]));

export type EmpfaengerZuordnungRow = { id: string; empfaengerNameOderIban: string; kategorie: string | null };
export type KategorieMappingRow = { id: string; finomKategorieBezeichnung: string; praxisKategorie: string };

export function FinomZuordnungen({
  empfaengerZuordnungen,
  kategorieMappings,
}: {
  empfaengerZuordnungen: EmpfaengerZuordnungRow[];
  kategorieMappings: KategorieMappingRow[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className={cardCls}>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-[var(--color-text)]">Finom-Zuordnungsregeln</h2>
        <button onClick={() => setOpen((o) => !o)} className="text-xs font-medium text-[var(--color-primary)] hover:underline">
          {open ? "Ausblenden" : "Verwalten"}
        </button>
      </div>
      {!open && (
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          {empfaengerZuordnungen.length} Empfänger-Regel(n), {kategorieMappings.length} Finom-Kategorie-Zuordnung(en).
        </p>
      )}
      {open && (
        <div className="mt-3 flex flex-col gap-6">
          <div>
            <p className="mb-2 text-xs font-semibold tracking-wide text-[var(--color-text-muted)] uppercase">
              Empfänger/IBAN → Kategorie (Schritt 1, „– keine –&quot; = wird ignoriert, z.B. Gehalt/private Entnahme)
            </p>
            <div className="flex flex-col gap-2">
              {empfaengerZuordnungen.map((z) => (
                <div key={z.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="flex-1 text-[var(--color-text)]">{z.empfaengerNameOderIban}</span>
                  <span className="text-[var(--color-text-muted)]">{z.kategorie ? KATEGORIE_LABEL[z.kategorie] : "ignorieren"}</span>
                  <DeleteButton onDelete={() => deleteEmpfaengerZuordnung(z.id)} />
                </div>
              ))}
              {empfaengerZuordnungen.length === 0 && <p className="text-sm text-[var(--color-text-muted)]">Noch keine Regeln.</p>}
            </div>
            <AddEmpfaengerForm />
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold tracking-wide text-[var(--color-text-muted)] uppercase">Finom-Kategorie → Praxis-Kategorie (Schritt 2)</p>
            <div className="flex flex-col gap-2">
              {kategorieMappings.map((m) => (
                <div key={m.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="flex-1 text-[var(--color-text)]">{m.finomKategorieBezeichnung}</span>
                  <span className="text-[var(--color-text-muted)]">{KATEGORIE_LABEL[m.praxisKategorie]}</span>
                  <DeleteButton onDelete={() => deleteKategorieMapping(m.id)} />
                </div>
              ))}
              {kategorieMappings.length === 0 && <p className="text-sm text-[var(--color-text-muted)]">Noch keine Zuordnungen.</p>}
            </div>
            <AddKategorieMappingForm />
          </div>
        </div>
      )}
    </div>
  );
}

function DeleteButton({ onDelete }: { onDelete: () => Promise<void> }) {
  const [pending, startTransition] = useTransition();
  return (
    <button disabled={pending} onClick={() => startTransition(onDelete)} className="text-xs font-medium text-[var(--color-coral)] hover:underline disabled:opacity-50">
      Löschen
    </button>
  );
}

function AddEmpfaengerForm() {
  const [name, setName] = useState("");
  const [kategorie, setKategorie] = useState("");
  const [pending, startTransition] = useTransition();

  return (
    <div className="mt-2 flex flex-wrap items-end gap-2 border-t border-[var(--color-border)] pt-2">
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Empfänger-Name oder IBAN" className={`flex-1 ${inputCls}`} />
      <select value={kategorie} onChange={(e) => setKategorie(e.target.value)} className={inputCls}>
        <option value="">– keine – (ignorieren)</option>
        {KATEGORIEN.map((k) => (
          <option key={k.value} value={k.value}>
            {k.label}
          </option>
        ))}
      </select>
      <button
        disabled={pending || !name.trim()}
        onClick={() =>
          startTransition(async () => {
            await addEmpfaengerZuordnung(name, kategorie);
            setName("");
            setKategorie("");
          })
        }
        className="rounded-[var(--radius-control)] bg-[var(--color-primary)] px-3 py-1.5 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
      >
        Hinzufügen
      </button>
    </div>
  );
}

function AddKategorieMappingForm() {
  const [bezeichnung, setBezeichnung] = useState("");
  const [kategorie, setKategorie] = useState("");
  const [pending, startTransition] = useTransition();

  return (
    <div className="mt-2 flex flex-wrap items-end gap-2 border-t border-[var(--color-border)] pt-2">
      <input value={bezeichnung} onChange={(e) => setBezeichnung(e.target.value)} placeholder="Finom-Kategorie (z.B. Miscellaneous)" className={`flex-1 ${inputCls}`} />
      <select value={kategorie} onChange={(e) => setKategorie(e.target.value)} className={inputCls}>
        <option value="">Praxis-Kategorie wählen…</option>
        {KATEGORIEN.map((k) => (
          <option key={k.value} value={k.value}>
            {k.label}
          </option>
        ))}
      </select>
      <button
        disabled={pending || !bezeichnung.trim() || !kategorie}
        onClick={() =>
          startTransition(async () => {
            await addKategorieMapping(bezeichnung, kategorie);
            setBezeichnung("");
            setKategorie("");
          })
        }
        className="rounded-[var(--radius-control)] bg-[var(--color-primary)] px-3 py-1.5 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
      >
        Hinzufügen
      </button>
    </div>
  );
}

const cardCls = "rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-soft)]";
