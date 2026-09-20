import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/rbac";
import { downloadFile } from "@/lib/storage";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;

  const user = await prisma.user.findUnique({ where: { id }, select: { avatarUrl: true } });
  if (!user?.avatarUrl) {
    return NextResponse.json({ error: "Kein Profilbild hinterlegt" }, { status: 404 });
  }

  const { body, contentType } = await downloadFile(user.avatarUrl);
  return new NextResponse(new Uint8Array(body), {
    headers: { "Content-Type": contentType ?? "image/png", "Cache-Control": "private, max-age=300" },
  });
}
