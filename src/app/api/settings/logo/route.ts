import { NextResponse } from "next/server";
import { getSettings } from "@/lib/settings";
import { downloadFile } from "@/lib/storage";

// Bewusst ohne Login-Zwang erreichbar: das Logo wird auch auf der Login-Seite angezeigt
// und ist ein reines Branding-Asset ohne schützenswerte Daten.
export async function GET() {
  const settings = await getSettings();
  if (!settings.logoUrl) {
    return NextResponse.json({ error: "Kein Logo hinterlegt" }, { status: 404 });
  }

  const { body, contentType } = await downloadFile(settings.logoUrl);
  return new NextResponse(new Uint8Array(body), {
    headers: {
      "Content-Type": contentType ?? "image/png",
      "Cache-Control": "public, max-age=300",
    },
  });
}
