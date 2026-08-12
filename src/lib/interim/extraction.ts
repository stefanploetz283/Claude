"use server";

import { anthropic } from "@/lib/anthropic";
import { toDateInputValue } from "@/lib/date";
import { requireInterimAdmin } from "@/lib/rbac";

// Eigenständige, vereinfachte Extraktion für den Interimsmodus - bewusst NICHT die bestehende
// extractServiceEntryFromVoice aus voice-actions.ts, da diese an das Case-Fuzzy-Matching des
// künftigen Fallsystems gekoppelt ist. Im Interimsmodus ist der Fall schon vor dem Diktat gewählt,
// es muss also kein Klientenname erkannt/zugeordnet werden - nur Datum, Beginn, Ende, Inhalt.
export type InterimVoiceExtractionResult =
  | { ok: true; date: string; startTime: string; endTime: string; content: string }
  | { ok: false; error: string };

export async function extractInterimEntryFromVoice(transcript: string): Promise<InterimVoiceExtractionResult> {
  await requireInterimAdmin();

  const trimmed = transcript.trim();
  if (!trimmed) return { ok: false, error: "Keine Sprache erkannt. Bitte erneut versuchen." };
  if (!process.env.ANTHROPIC_API_KEY) {
    return { ok: false, error: "Das Diktat ist nicht konfiguriert (fehlender API-Key)." };
  }

  const today = toDateInputValue(new Date());

  let response;
  try {
    response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      system: `Du extrahierst strukturierte Daten aus dem Diktat einer sozialpädagogischen Fachkraft (Einzelselbstständig, Erziehungsbeistandschaft/PROS) für eine Monatsabrechnung. Heutiges Datum (Referenz für relative Angaben wie "heute"): ${today}. Formuliere den Inhaltstext fachlich sauber und sachlich in ganzen Sätzen, auf Basis des Diktats - erfinde keine Inhalte hinzu. Antworte ausschließlich über den bereitgestellten Tool-Aufruf.`,
      tool_choice: { type: "tool", name: "extract_interim_entry" },
      tools: [
        {
          name: "extract_interim_entry",
          description: "Extrahiert die strukturierten Felder eines Leistungseintrags aus einem Diktat.",
          input_schema: {
            type: "object",
            properties: {
              date: { type: "string", description: "Datum der Leistung im Format YYYY-MM-DD." },
              startTime: { type: "string", description: "Startzeit im 24h-Format HH:mm." },
              endTime: { type: "string", description: "Endzeit im 24h-Format HH:mm." },
              content: {
                type: "string",
                description: "Fachlich sauber formulierter Text (Maßnahmen/Inhalte/Vereinbarungen/Besonderes) basierend auf dem Diktat, in ganzen Sätzen.",
              },
            },
            required: ["date", "startTime", "endTime", "content"],
            additionalProperties: false,
          },
          strict: true,
        },
      ],
      messages: [{ role: "user", content: trimmed }],
    });
  } catch (err) {
    console.error("Anthropic-Aufruf für Interim-Diktat-Extraktion fehlgeschlagen:", err);
    return { ok: false, error: "Die Sprachverarbeitung ist fehlgeschlagen. Bitte erneut versuchen." };
  }

  if (response.stop_reason === "refusal") {
    return { ok: false, error: "Das Diktat konnte nicht verarbeitet werden." };
  }

  const toolUse = response.content.find((b) => b.type === "tool_use" && b.name === "extract_interim_entry");
  if (!toolUse || toolUse.type !== "tool_use") {
    return { ok: false, error: "Aus dem Diktat konnten keine Daten extrahiert werden. Bitte erneut versuchen." };
  }

  const extracted = toolUse.input as { date: string; startTime: string; endTime: string; content: string };

  if (!/^\d{4}-\d{2}-\d{2}$/.test(extracted.date) || !/^\d{2}:\d{2}$/.test(extracted.startTime) || !/^\d{2}:\d{2}$/.test(extracted.endTime)) {
    return { ok: false, error: "Datum oder Uhrzeit aus dem Diktat konnten nicht eindeutig erkannt werden. Bitte manuell nachtragen." };
  }

  return { ok: true, date: extracted.date, startTime: extracted.startTime, endTime: extracted.endTime, content: extracted.content };
}
