import Anthropic from "@anthropic-ai/sdk";

/** Serverseitiger Anthropic-Client. Der API-Key wird nie an den Browser ausgeliefert. */
export const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
