import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/rbac";
import { downloadFile } from "@/lib/storage";

export async function GET(_req: Request, { params }: { params: Promise<{ itemId: string }> }) {
  await requireUser();
  const { itemId } = await params;

  const item = await prisma.knowledgeItem.findUnique({ where: { id: itemId } });
  if (!item || !item.fileKey) {
    return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
  }

  const { body } = await downloadFile(item.fileKey);

  return new NextResponse(new Uint8Array(body), {
    headers: {
      "Content-Type": item.mimeType ?? "application/octet-stream",
      "Content-Disposition": `inline; filename="${encodeURIComponent(item.title)}"`,
    },
  });
}
