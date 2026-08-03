"use server";

import { prisma } from "@/lib/prisma";
import { requireUser, caseVisibilityWhere } from "@/lib/rbac";
import { anthropic } from "@/lib/anthropic";
import { bestMatches } from "@/lib/fuzzy-match";
import { toDateInputValue } from "@/lib/date";

export type VoiceCaseCandidate = {
  caseId: string;
  clientName: string;
  helpTypeName: string;
  score: number;
};

export type VoiceExtractionResult =
  | {
      ok: true;
      date: string;
      startTime: string;
      endTime: string;
      remarks: string;
      clientNameHeard: string;
      autoSelectedCaseId: string | null;
      candidates: VoiceCaseCandidate[];
    }
  | { ok: false; error: string };

const AUTO_SELECT_MIN_SCORE = 0.75;
const CANDIDATE_MIN_SCORE = 0.45;
const MAX_CANDIDATES = 5;

export async function extractServiceEntryFromVoice(transcript: string): Promise<VoiceExtractionResult> {
  const trimmed = transcript.trim();
  if (!trimmed) {
    return { ok: false, error: "Keine Sprache erkannt. Bitte erneut versuchen." };
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return { ok: false, error: "Das Diktat ist nicht konfiguriert (fehlender API-Key). Bitte den Administrator informieren." };
  }

  const user = await requireUser();

  const cases = await prisma.case.findMany({
    where: { ...caseVisibilityWhere(user), status: { not: "COMPLETED" } },
    include: { client: true, helpType: true },
  });

  const today = toDateInputValue(new Date());

  let response;
  try {
    response = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 1024,
      system: `Du extrahierst strukturierte Daten aus dem Diktat einer sozialpädagogischen Fachkraft für eine Leistungsdokumentation. Heutiges Datum (Referenz für relative Angaben wie "heute" oder unvollständige Daten ohne Jahr): ${today}. Formuliere den Bemerkungstext fachlich sauber und sachlich in ganzen Sätzen, auf Basis des Diktats - erfinde keine Inhalte hinzu, die nicht genannt wurden. Antworte ausschließlich über den bereitgestellten Tool-Aufruf.`,
      tool_choice: { type: "tool", name: "extract_service_entry" },
      tools: [
        {
          name: "extract_service_entry",
          description: "Extrahiert die strukturierten Felder einer Leistungsdokumentation aus einem Diktat.",
          input_schema: {
            type: "object",
            properties: {
              clientName: {
                type: "string",
                description: "Der Name des Klienten, wie im Diktat genannt (unverändert übernehmen, nicht korrigieren).",
              },
              date: {
                type: "string",
                description: "Datum der Leistung im Format YYYY-MM-DD. Relative oder unvollständige Angaben anhand des Referenzdatums auflösen.",
              },
              startTime: { type: "string", description: "Startzeit im 24h-Format HH:mm." },
              endTime: { type: "string", description: "Endzeit im 24h-Format HH:mm." },
              remarks: {
                type: "string",
                description: "Fachlich sauber formulierter Bemerkungstext basierend auf dem Diktat, in ganzen Sätzen.",
              },
            },
            required: ["clientName", "date", "startTime", "endTime", "remarks"],
            additionalProperties: false,
          },
          strict: true,
        },
      ],
      messages: [{ role: "user", content: trimmed }],
    });
  } catch {
    return { ok: false, error: "Die Sprachverarbeitung ist fehlgeschlagen. Bitte erneut versuchen." };
  }

  if (response.stop_reason === "refusal") {
    return { ok: false, error: "Das Diktat konnte nicht verarbeitet werden." };
  }

  const toolUse = response.content.find((b) => b.type === "tool_use" && b.name === "extract_service_entry");
  if (!toolUse || toolUse.type !== "tool_use") {
    return { ok: false, error: "Aus dem Diktat konnten keine Daten extrahiert werden. Bitte erneut versuchen." };
  }

  const extracted = toolUse.input as {
    clientName: string;
    date: string;
    startTime: string;
    endTime: string;
    remarks: string;
  };

  if (!/^\d{4}-\d{2}-\d{2}$/.test(extracted.date) || !/^\d{2}:\d{2}$/.test(extracted.startTime) || !/^\d{2}:\d{2}$/.test(extracted.endTime)) {
    return { ok: false, error: "Datum oder Uhrzeit aus dem Diktat konnten nicht eindeutig erkannt werden. Bitte manuell nachtragen." };
  }

  const matches = bestMatches(
    extracted.clientName,
    cases,
    (c) => `${c.client.lastName}, ${c.client.firstName}`,
    CANDIDATE_MIN_SCORE
  );

  const candidates: VoiceCaseCandidate[] = matches.slice(0, MAX_CANDIDATES).map((m) => ({
    caseId: m.item.id,
    clientName: `${m.item.client.lastName}, ${m.item.client.firstName}`,
    helpTypeName: m.item.helpType.name,
    score: m.score,
  }));

  const topScore = candidates[0]?.score ?? 0;
  const secondScore = candidates[1]?.score ?? 0;
  const clientCandidatesForTopMatch = candidates.filter((c) => c.clientName === candidates[0]?.clientName);

  let autoSelectedCaseId: string | null = null;
  if (topScore >= AUTO_SELECT_MIN_SCORE && topScore - secondScore >= 0.1 && clientCandidatesForTopMatch.length === 1) {
    autoSelectedCaseId = candidates[0].caseId;
  }

  return {
    ok: true,
    date: extracted.date,
    startTime: extracted.startTime,
    endTime: extracted.endTime,
    remarks: extracted.remarks,
    clientNameHeard: extracted.clientName,
    autoSelectedCaseId,
    candidates,
  };
}
