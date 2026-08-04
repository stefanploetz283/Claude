import { readFileSync } from "fs";
import path from "path";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { renderHtmlTemplateToPdf } from "./html-pdf";

const TEMPLATE_PATH = path.join(process.cwd(), "src", "lib", "export", "templates", "rechnung.html");

function formatEuro(amount: number): string {
  return amount.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

/**
 * Legt bei Bedarf eine neue Rechnung an (fortlaufende, lückenlose Nummer pro Jahr) und rendert das PDF.
 * Bei erneuter Anfrage für denselben Fall+Zeitraum wird die bereits vergebene Nummer wiederverwendet,
 * damit Mehrfachklicks keine Nummern verbrauchen (steuerrechtliche Lückenlosigkeit).
 */
export async function getOrCreateInvoicePdf(params: {
  caseId: string;
  periodFrom: Date;
  periodTo: Date;
  issuedById: string;
}): Promise<{ pdf: Buffer; number: string } | { error: string }> {
  const { caseId, periodFrom, periodTo, issuedById } = params;

  const settings = await prisma.settings.findUnique({ where: { id: "singleton" } });
  if (!settings?.hourlyRate) {
    return { error: "Bitte zuerst einen Stundensatz in den Admin-Einstellungen hinterlegen." };
  }
  const hourlyRate = settings.hourlyRate.toNumber();

  const caseRecord = await prisma.case.findUnique({ where: { id: caseId }, include: { client: true, helpType: true } });
  if (!caseRecord) return { error: "Fall nicht gefunden." };

  let invoice = await prisma.invoice.findUnique({
    where: { caseId_periodFrom_periodTo: { caseId, periodFrom, periodTo } },
  });

  if (!invoice) {
    const totalMinutes = await prisma.serviceEntry.aggregate({
      where: { caseId, date: { gte: periodFrom, lte: periodTo } },
      _sum: { durationMinutes: true },
    });
    const hours = (totalMinutes._sum.durationMinutes ?? 0) / 60;
    if (hours <= 0) {
      return { error: "Für den gewählten Zeitraum sind keine dokumentierten Stunden vorhanden." };
    }
    const totalAmount = Math.round(hours * hourlyRate * 100) / 100;
    const year = periodTo.getUTCFullYear();

    try {
      invoice = await prisma.$transaction(async (tx) => {
        const last = await tx.invoice.findFirst({ where: { year }, orderBy: { sequence: "desc" } });
        const sequence = (last?.sequence ?? 0) + 1;
        const month = String(periodTo.getUTCMonth() + 1).padStart(2, "0");
        const number = `${year}-${month}-${String(sequence).padStart(3, "0")}`;
        return tx.invoice.create({
          data: { caseId, number, year, sequence, periodFrom, periodTo, hours, hourlyRate, totalAmount, issuedById },
        });
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        invoice = await prisma.invoice.findUnique({
          where: { caseId_periodFrom_periodTo: { caseId, periodFrom, periodTo } },
        });
        if (!invoice) return { error: "Rechnung konnte nicht erstellt werden. Bitte erneut versuchen." };
      } else {
        return { error: "Rechnung konnte nicht erstellt werden. Bitte erneut versuchen." };
      }
    }
  }

  const faelligkeitsdatum = new Date(invoice.issuedAt.getTime() + 14 * 24 * 60 * 60 * 1000);

  const templateHtml = readFileSync(TEMPLATE_PATH, "utf-8");
  const pdf = await renderHtmlTemplateToPdf(templateHtml, {
    dokument_titel: "Rechnung",
    rechnungsnummer: invoice.number,
    rechnungsdatum: formatDate(invoice.issuedAt),
    faelligkeitsdatum: formatDate(faelligkeitsdatum),
    kostentraeger: caseRecord.authority,
    kostentraeger_strasse: caseRecord.authorityStreet ?? "",
    kostentraeger_plz: caseRecord.authorityPostalCodeCity ?? "",
    leistungszeitraum: `${formatDate(periodFrom)}–${formatDate(periodTo)}`,
    row1_leistung: `${caseRecord.helpType.name} – ${caseRecord.client.lastName}, ${caseRecord.client.firstName}`,
    row1_stunden: invoice.hours.toNumber().toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    row1_satz: formatEuro(invoice.hourlyRate.toNumber()),
    row1_betrag: formatEuro(invoice.totalAmount.toNumber()),
    endbetrag: formatEuro(invoice.totalAmount.toNumber()),
    hinweis_text: "Hinweis: Bitte den Betrag innerhalb von 14 Tagen auf das angegebene Konto überweisen.",
    seitenzahl: "Seite 1 von 1",
  });

  return { pdf, number: invoice.number };
}
