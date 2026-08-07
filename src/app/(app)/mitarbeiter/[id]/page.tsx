import { redirect } from "next/navigation";

export default async function MitarbeiterDetailRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/mitarbeiter/${id}/stammdaten`);
}
