"use client";

import { useTransition } from "react";
import { deleteKnowledgeItem } from "./actions";

export type ItemCardData = {
  id: string;
  title: string;
  type: "DOCUMENT" | "IMAGE" | "LINK";
  description: string | null;
  url: string | null;
  folder: string | null;
  tags: string[];
  createdByName: string;
  createdAt: string;
  canDelete: boolean;
};

const TYPE_ICONS: Record<string, string> = { DOCUMENT: "📄", IMAGE: "🖼️", LINK: "🔗" };

export function ItemCard({ item }: { item: ItemCardData }) {
  const [pending, startTransition] = useTransition();
  const href = item.type === "LINK" ? item.url! : `/api/knowledge-base/${item.id}/download`;

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-black/10 bg-white p-4">
      <div className="flex items-start justify-between gap-2">
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-[var(--color-primary)] hover:underline"
        >
          {TYPE_ICONS[item.type]} {item.title}
        </a>
        {item.canDelete && (
          <button
            disabled={pending}
            onClick={() => {
              if (confirm(`"${item.title}" wirklich löschen?`)) startTransition(() => deleteKnowledgeItem(item.id));
            }}
            className="text-xs text-[var(--color-danger)] hover:underline disabled:opacity-50"
          >
            Löschen
          </button>
        )}
      </div>
      {item.description && <p className="text-sm text-black/60">{item.description}</p>}
      <div className="flex flex-wrap items-center gap-1 text-xs text-black/50">
        {item.folder && <span className="rounded bg-black/5 px-2 py-0.5">{item.folder}</span>}
        {item.tags.map((t) => (
          <span key={t} className="rounded-full bg-[var(--color-bg)] px-2 py-0.5">
            #{t}
          </span>
        ))}
      </div>
      <p className="text-[11px] text-black/40">
        {item.createdByName} · {item.createdAt}
      </p>
    </div>
  );
}
