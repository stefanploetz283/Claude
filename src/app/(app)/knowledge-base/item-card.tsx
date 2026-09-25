"use client";

import { useTransition } from "react";
import { deleteKnowledgeItem } from "./actions";
import { ProsCard } from "@/components/pros/pros-card";
import { IconFileText, IconImage, IconLink } from "@/components/pros/pros-icons";
import { groupPillCls, linkDangerCls } from "@/app/(app)/cases/case-ui";

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

const TYPE_LABEL: Record<ItemCardData["type"], string> = { DOCUMENT: "Dokument", IMAGE: "Bild", LINK: "Link" };

function TypeIcon({ type }: { type: ItemCardData["type"] }) {
  if (type === "IMAGE") return <IconImage />;
  if (type === "LINK") return <IconLink />;
  return <IconFileText />;
}

export function ItemCard({ item }: { item: ItemCardData }) {
  const [pending, startTransition] = useTransition();
  const href = item.type === "LINK" ? item.url! : `/api/knowledge-base/${item.id}/download`;

  return (
    <ProsCard className="flex flex-col gap-3 p-4">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--pros-sage-pale)] text-[var(--color-primary)]">
          <TypeIcon type={item.type} />
        </span>
        <div className="min-w-0 flex-1">
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-sm leading-snug font-semibold break-words text-[var(--color-primary)] hover:underline"
          >
            <span className="sr-only">{TYPE_LABEL[item.type]}: </span>
            {item.title}
          </a>
          <p className="mt-0.5 text-[11px] text-[var(--color-text-muted)]">
            {item.createdByName} · {item.createdAt}
          </p>
        </div>
        {item.canDelete && (
          <button
            disabled={pending}
            aria-label={`„${item.title}“ löschen`}
            onClick={() => {
              if (confirm(`"${item.title}" wirklich löschen?`)) startTransition(() => deleteKnowledgeItem(item.id));
            }}
            className={`shrink-0 ${linkDangerCls}`}
          >
            Löschen
          </button>
        )}
      </div>
      {item.description && <p className="text-sm leading-relaxed text-[var(--color-text-muted)]">{item.description}</p>}
      {(item.folder || item.tags.length > 0) && (
        <div className="flex flex-wrap items-center gap-1.5">
          {item.folder && <span className={groupPillCls}>{item.folder}</span>}
          {item.tags.map((t) => (
            <span
              key={t}
              className="rounded-full border border-[var(--pros-border-default)] px-2.5 py-0.5 text-[11px] font-medium text-[var(--color-text-muted)]"
            >
              #{t}
            </span>
          ))}
        </div>
      )}
    </ProsCard>
  );
}
