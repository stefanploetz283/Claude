"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser, canAccessCase } from "@/lib/rbac";
import { logAccess } from "@/lib/access-log";
import { anthropic } from "@/lib/anthropic";
import { BERICHTS_KAPITEL_ORDER, BERICHTS_KAPITEL_INFO, isBerichtsKapitel } from "@/lib/berichtsbausteine/manual";
import type { BerichtsKapitel } from "@prisma/client";

// Berichtsbausteine gelten als fachliche Dokumentation wie die bestehenden Bemerkungstexte - Zugriff
// ausschließlich über canAccessCase (schließt die Rolle Verwaltung serverseitig konsequent aus, siehe rbac.ts).
async function assertCaseAccess(caseId: string) {
  const user = await requireUser();
  const caseRecord = await prisma.case.findUnique({ where: { id: caseId } });
  if (!caseRecord || !canAccessCase(user, caseRecord)) {
    throw new Error("Kein Zugriff auf diesen Fall.");
  }
  return user;
}

export type KategorieVorschlagResult = { ok: true; kategorie: BerichtsKapitel | null } | { ok: false; error: string };

/**
 * Grobe, unverbindliche Vorab-Kategorie bei der Erfassung (Prompt Teil 1/3 Punkt 4) - vor dem Speichern
 * durch die Fachkraft korrigierbar. Die endgültige, ggf. mehrfache Zuordnung mit vollem Manual-Kontext
 * erfolgt erst bei der Berichtsgenerierung (spätere Phase), nicht hier.
 */
export async function suggestBerichtsbausteinKategorie(caseId: string, text: string): Promise<KategorieVorschlagResult> {
  const trimmed = text.trim();
  if (!trimmed) return { ok: false, error: "Kein Text vorhanden." };
  await assertCaseAccess(caseId);

  if (!process.env.ANTHROPIC_API_KEY) {
    // Kein Blocker: Vorschlag ist ohnehin unverbindlich, Kategorie bleibt einfach manuell wählbar.
    return { ok: true, kategorie: null };
  }

  const kapitelListe = BERICHTS_KAPITEL_ORDER.map((k) => {
    const info = BERICHTS_KAPITEL_INFO[k];
    return `- ${k}: "${info.label}" (${info.hauptkapitel})${info.leitfrage ? ` - Leitfrage: ${info.leitfrage}` : ""}`;
  }).join("\n");

  let response;
  try {
    response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 256,
      system: `Du ordnest einen Baustein für einen sozialpädagogischen Abschlussbericht (PROS-Fachkonzept) vorläufig einem Kapitel zu. Dies ist nur eine grobe, unverbindliche Einordnung - die Fachkraft kann sie vor dem Speichern korrigieren, und die endgültige, ggf. abweichende Zuordnung erfolgt erst später mit vollem Kontext aller gesammelten Bausteine. Kapitel:\n${kapitelListe}\n\nAntworte ausschließlich über den bereitgestellten Tool-Aufruf.`,
      tool_choice: { type: "tool", name: "suggest_kapitel" },
      tools: [
        {
          name: "suggest_kapitel",
          description: "Schlägt ein Kapitel für den Baustein vor.",
          input_schema: {
            type: "object",
            properties: {
              kapitel: { type: "string", enum: BERICHTS_KAPITEL_ORDER, description: "Das am besten passende Kapitel." },
            },
            required: ["kapitel"],
            additionalProperties: false,
          },
          strict: true,
        },
      ],
      messages: [{ role: "user", content: trimmed }],
    });
  } catch (err) {
    console.error("Anthropic-Aufruf für Kapitel-Vorschlag fehlgeschlagen:", err);
    return { ok: true, kategorie: null };
  }

  if (response.stop_reason === "refusal") return { ok: true, kategorie: null };

  const toolUse = response.content.find((b) => b.type === "tool_use" && b.name === "suggest_kapitel");
  if (!toolUse || toolUse.type !== "tool_use") return { ok: true, kategorie: null };

  const { kapitel } = toolUse.input as { kapitel: string };
  return { ok: true, kategorie: isBerichtsKapitel(kapitel) ? kapitel : null };
}

export type ActionState = { error?: string; success?: boolean } | undefined;

export async function createBerichtsbaustein(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const caseId = String(formData.get("caseId") ?? "");
  const originaltext = String(formData.get("originaltext") ?? "").trim();
  const vorlaeufigeKategorieRaw = String(formData.get("vorlaeufigeKategorie") ?? "").trim();
  const bezugBausteinId = String(formData.get("bezugBausteinId") ?? "").trim() || null;
  const triadeZuordnung = formData
    .getAll("triadeZuordnung")
    .map((v) => String(v).trim())
    .filter(Boolean);

  if (!originaltext) return { error: "Bitte einen Text erfassen." };

  const vorlaeufigeKategorie = isBerichtsKapitel(vorlaeufigeKategorieRaw) ? vorlaeufigeKategorieRaw : null;

  const user = await assertCaseAccess(caseId);

  if (bezugBausteinId) {
    const referenced = await prisma.berichtsbaustein.findUnique({ where: { id: bezugBausteinId } });
    if (!referenced || referenced.caseId !== caseId) {
      return { error: "Der referenzierte Baustein gehört nicht zu diesem Fall." };
    }
  }

  const created = await prisma.berichtsbaustein.create({
    data: { caseId, erstellerId: user.id, originaltext, vorlaeufigeKategorie, bezugBausteinId, triadeZuordnung },
  });

  await logAccess({ userId: user.id, action: "CREATE", entityType: "Berichtsbaustein", entityId: created.id });
  revalidatePath(`/cases/${caseId}/berichtsbausteine`);
  revalidatePath(`/cases/${caseId}`);
  return { success: true };
}
