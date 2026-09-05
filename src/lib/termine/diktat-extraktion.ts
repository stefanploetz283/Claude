"use server";

// Terminbuchung per Sprachdiktat: extrahiert strukturierte Buchungsfelder aus einem Diktattext, analog
// zum bewährten Muster in src/app/(app)/voice-entry/voice-actions.ts. Ergebnis geht immer erst in einen
// Bestätigungs-Screen (siehe termin-diktat-widget.tsx) - hier wird nichts gespeichert.
import { prisma } from "@/lib/prisma";
import { requireUser, caseVisibilityWhere } from "@/lib/rbac";
import { anthropic } from "@/lib/anthropic";
import { bestMatches } from "@/lib/fuzzy-match";
import { toDateInputValue } from "@/lib/date";
import type { TerminKategorie, TerminArt } from "@prisma/client";

export type TerminCaseCandidate = { caseId: string; clientName: string; helpTypeName: string; score: number };

export type TerminVoiceResult =
  | {
      ok: true;
      kategorie: TerminKategorie;
      terminArt: TerminArt | null;
      titel: string;
      einzelmassnahmeBezeichnung: string | null;
      date: string;
      startTime: string;
      endTime: string;
      clientNameHeard: string | null;
      autoSelectedCaseId: string | null;
      candidates: TerminCaseCandidate[];
    }
  | { ok: false; error: string };

const AUTO_SELECT_MIN_SCORE = 0.75;
const CANDIDATE_MIN_SCORE = 0.45;
const MAX_CANDIDATES = 5;

const KATEGORIE_WERTE = ["FALL_TERMIN", "INTERNER_TERMIN", "EINZELMASSNAHME"] as const;
const TERMINART_WERTE = ["KIND_BERATUNG", "ELTERN_BERATUNG", "SCHULHOSPITATION", "ELTERNKONTAKT", "SCHULKONTAKT", "SONSTIGES"] as const;

export async function extractTerminFromVoice(transcript: string): Promise<TerminVoiceResult> {
  const trimmed = transcript.trim();
  if (!trimmed) return { ok: false, error: "Keine Sprache erkannt. Bitte erneut versuchen." };
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
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      system: `Du extrahierst strukturierte Daten aus dem Diktat einer sozialpädagogischen Fachkraft für eine Terminbuchung. Heutiges Datum (Referenz für relative Angaben wie "morgen" oder unvollständige Daten): ${today}. Kategorie FALL_TERMIN nur, wenn ein konkreter Klient/Fall genannt wird; INTERNER_TERMIN für Termine ohne Fallbezug (z.B. Teambesprechung); EINZELMASSNAHME für einmalige Termine ohne laufenden Fall (z.B. eine Gesprächsweisung der Jugendgerichtshilfe), dort den genannten Namen/das Aktenzeichen als einzelmassnahmeBezeichnung übernehmen. terminArt nur bei FALL_TERMIN sinnvoll befüllen. Antworte ausschließlich über den bereitgestellten Tool-Aufruf.`,
      tool_choice: { type: "tool", name: "extract_termin" },
      tools: [
        {
          name: "extract_termin",
          description: "Extrahiert die strukturierten Felder einer Terminbuchung aus einem Diktat.",
          input_schema: {
            type: "object",
            properties: {
              kategorie: { type: "string", enum: [...KATEGORIE_WERTE], description: "Terminkategorie." },
              terminArt: {
                type: "string",
                enum: [...TERMINART_WERTE],
                description: "Nur bei FALL_TERMIN relevant - die Art des Fall-Termins.",
              },
              clientName: { type: "string", description: "Name des Klienten/Falls, falls kategorie FALL_TERMIN ist, sonst leerer String." },
              titel: { type: "string", description: "Kurzbezeichnung des Termins, z.B. 'Teambesprechung' oder 'Elternberatung'." },
              einzelmassnahmeBezeichnung: {
                type: "string",
                description: "Nur bei EINZELMASSNAHME: freier Name/Aktenzeichen, sonst leerer String.",
              },
              date: { type: "string", description: "Datum im Format YYYY-MM-DD." },
              startTime: { type: "string", description: "Startzeit im 24h-Format HH:mm." },
              endTime: { type: "string", description: "Endzeit im 24h-Format HH:mm." },
            },
            required: ["kategorie", "terminArt", "clientName", "titel", "einzelmassnahmeBezeichnung", "date", "startTime", "endTime"],
            additionalProperties: false,
          },
          strict: true,
        },
      ],
      messages: [{ role: "user", content: trimmed }],
    });
  } catch (err) {
    console.error("Anthropic-Aufruf für Termin-Diktat fehlgeschlagen:", err);
    return { ok: false, error: "Die Sprachverarbeitung ist fehlgeschlagen. Bitte erneut versuchen." };
  }

  if (response.stop_reason === "refusal") return { ok: false, error: "Das Diktat konnte nicht verarbeitet werden." };

  const toolUse = response.content.find((b) => b.type === "tool_use" && b.name === "extract_termin");
  if (!toolUse || toolUse.type !== "tool_use") {
    return { ok: false, error: "Aus dem Diktat konnten keine Daten extrahiert werden. Bitte erneut versuchen." };
  }

  const extracted = toolUse.input as {
    kategorie: string;
    terminArt: string;
    clientName: string;
    titel: string;
    einzelmassnahmeBezeichnung: string;
    date: string;
    startTime: string;
    endTime: string;
  };

  if (!/^\d{4}-\d{2}-\d{2}$/.test(extracted.date) || !/^\d{2}:\d{2}$/.test(extracted.startTime) || !/^\d{2}:\d{2}$/.test(extracted.endTime)) {
    return { ok: false, error: "Datum oder Uhrzeit aus dem Diktat konnten nicht eindeutig erkannt werden. Bitte manuell nachtragen." };
  }
  const kategorie = (KATEGORIE_WERTE as readonly string[]).includes(extracted.kategorie) ? (extracted.kategorie as TerminKategorie) : "INTERNER_TERMIN";
  const terminArt = kategorie === "FALL_TERMIN" && (TERMINART_WERTE as readonly string[]).includes(extracted.terminArt) ? (extracted.terminArt as TerminArt) : null;

  let candidates: TerminCaseCandidate[] = [];
  let autoSelectedCaseId: string | null = null;
  if (kategorie === "FALL_TERMIN" && extracted.clientName.trim()) {
    const matches = bestMatches(extracted.clientName, cases, (c) => `${c.client.lastName}, ${c.client.firstName}`, CANDIDATE_MIN_SCORE);
    candidates = matches.slice(0, MAX_CANDIDATES).map((m) => ({
      caseId: m.item.id,
      clientName: `${m.item.client.lastName}, ${m.item.client.firstName}`,
      helpTypeName: m.item.helpType.name,
      score: m.score,
    }));
    const topScore = candidates[0]?.score ?? 0;
    const secondScore = candidates[1]?.score ?? 0;
    const clientCandidatesForTopMatch = candidates.filter((c) => c.clientName === candidates[0]?.clientName);
    if (topScore >= AUTO_SELECT_MIN_SCORE && topScore - secondScore >= 0.1 && clientCandidatesForTopMatch.length === 1) {
      autoSelectedCaseId = candidates[0].caseId;
    }
  }

  return {
    ok: true,
    kategorie,
    terminArt,
    titel: extracted.titel.trim() || (kategorie === "FALL_TERMIN" ? (terminArt ?? "Termin") : "Termin"),
    einzelmassnahmeBezeichnung: kategorie === "EINZELMASSNAHME" ? extracted.einzelmassnahmeBezeichnung.trim() || null : null,
    date: extracted.date,
    startTime: extracted.startTime,
    endTime: extracted.endTime,
    clientNameHeard: kategorie === "FALL_TERMIN" ? extracted.clientName : null,
    autoSelectedCaseId,
    candidates,
  };
}
