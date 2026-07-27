import { getSettings } from "@/lib/settings";
import { downloadFile } from "@/lib/storage";
import type { PracticeForExport } from "./case-pdf";

export async function getPracticeForExport(): Promise<PracticeForExport> {
  const settings = await getSettings();

  let logoBuffer: Buffer | null = null;
  if (settings.logoUrl) {
    try {
      const { body } = await downloadFile(settings.logoUrl);
      logoBuffer = body;
    } catch {
      logoBuffer = null;
    }
  }

  return {
    name: settings.practiceName,
    address: settings.practiceAddress,
    phone: settings.practicePhone,
    email: settings.practiceEmail,
    logoBuffer,
  };
}
