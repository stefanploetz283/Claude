"use server";

// Konsolidierung Betriebswirtschaftstool, Schritt 1/3: einmaliges, idempotentes Migrations-Werkzeug.
// Übernimmt bestehende IstKostenEintrag- (Cockpit) und BudgetAusgabe-Zeilen (Budgetrechner) nach
// IstBuchung, ohne die alten Tabellen zu verändern oder zu löschen - der bestehende Cockpit- und
// Budgetrechner-Code liest weiterhin unverändert aus den alten Tabellen, bis Schritt 2/3 umstellen.
// Bewusst als typsicheres Admin-Werkzeug statt als SQL-Migration: Kosten-/Umsatzdaten sind produktive
// Finanzdaten, die sich lokal nicht gegen eine echte Datenbank testen lassen - hier lässt sich wenigstens
// per tsc/build prüfen, und die Vorschau zeigt vor dem Schreiben, was passieren wird.
//
// Idempotenz: jede migrierte Zeile bekommt einen deterministischen dedupKey ("migration:ike:<alte ID>"
// bzw. "migration:ba:<alte ID>"). Erneutes Ausführen überspringt bereits migrierte Zeilen automatisch
// (createMany mit skipDuplicates), es entstehen also keine Duplikate bei mehrfachem Klick.
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/rbac";
import { logAccess } from "@/lib/access-log";
import { KOSTEN_KATEGORIE_LABEL } from "@/lib/betriebscockpit";
import type { KostenKategorie } from "@prisma/client";

export type MigrationVorschau = {
  offeneIstKostenEintraege: number;
  offeneBudgetAusgaben: number;
  neuePlatzhalterPositionen: { jahr: number; kategorie: KostenKategorie; label: string }[];
  bereitsMigriert: boolean;
};

export async function ladeMigrationVorschau(): Promise<MigrationVorschau> {
  await requireAdmin();

  const [istKostenEintraege, budgetAusgaben] = await Promise.all([
    prisma.istKostenEintrag.findMany({ select: { id: true, datum: true, kategorie: true } }),
    prisma.budgetAusgabe.findMany({ select: { id: true } }),
  ]);

  const dedupKeysIke = istKostenEintraege.map((r) => `migration:ike:${r.id}`);
  const dedupKeysBa = budgetAusgaben.map((r) => `migration:ba:${r.id}`);
  const bereitsVorhanden = await prisma.istBuchung.findMany({
    where: { dedupKey: { in: [...dedupKeysIke, ...dedupKeysBa] } },
    select: { dedupKey: true },
  });
  const vorhandenSet = new Set(bereitsVorhanden.map((r) => r.dedupKey));

  const offeneIke = istKostenEintraege.filter((r) => !vorhandenSet.has(`migration:ike:${r.id}`));
  const offeneBa = budgetAusgaben.filter((r) => !vorhandenSet.has(`migration:ba:${r.id}`));

  const kombinationen = new Map<string, { jahr: number; kategorie: KostenKategorie }>();
  for (const r of offeneIke) {
    const jahr = r.datum.getUTCFullYear();
    kombinationen.set(`${jahr}|${r.kategorie}`, { jahr, kategorie: r.kategorie });
  }
  const existierendePlatzhalter = await prisma.budgetKategorie.findMany({
    where: { quelle: "migration" },
    select: { jahr: true, kategorie: true },
  });
  const existierendSet = new Set(existierendePlatzhalter.map((p) => `${p.jahr}|${p.kategorie}`));

  const neuePlatzhalterPositionen = Array.from(kombinationen.values())
    .filter((k) => !existierendSet.has(`${k.jahr}|${k.kategorie}`))
    .map((k) => ({ ...k, label: `Altbestand ${KOSTEN_KATEGORIE_LABEL[k.kategorie]} ${k.jahr} (nicht granular erfasst)` }))
    .sort((a, b) => a.jahr - b.jahr || a.kategorie.localeCompare(b.kategorie));

  return {
    offeneIstKostenEintraege: offeneIke.length,
    offeneBudgetAusgaben: offeneBa.length,
    neuePlatzhalterPositionen,
    bereitsMigriert: offeneIke.length === 0 && offeneBa.length === 0,
  };
}

export type MigrationErgebnis = {
  platzhalterAngelegt: number;
  istKostenEintraegeMigriert: number;
  budgetAusgabenMigriert: number;
  uebersprungenDuplikat: number;
};

export async function fuehreMigrationAus(): Promise<MigrationErgebnis> {
  const admin = await requireAdmin();

  const ergebnis = await prisma.$transaction(async (tx) => {
    // Schritt A: Platzhalter-Positionen je (Jahr, Kategorie) anlegen, für die es noch keine gibt -
    // Jahresbudget bewusst 0, das ist Teil der "zu klären"-Liste, die Stefan danach durchgeht.
    const istKostenEintraege = await tx.istKostenEintrag.findMany();
    const kombinationen = new Map<string, { jahr: number; kategorie: KostenKategorie }>();
    for (const r of istKostenEintraege) {
      const jahr = r.datum.getUTCFullYear();
      kombinationen.set(`${jahr}|${r.kategorie}`, { jahr, kategorie: r.kategorie });
    }

    const platzhalterIdByKey = new Map<string, string>();
    let platzhalterAngelegt = 0;
    for (const { jahr, kategorie } of kombinationen.values()) {
      const name = `Altbestand ${KOSTEN_KATEGORIE_LABEL[kategorie]} ${jahr} (nicht granular erfasst)`;
      const bestehend = await tx.budgetKategorie.findUnique({ where: { name_jahr: { name, jahr } } });
      if (bestehend) {
        platzhalterIdByKey.set(`${jahr}|${kategorie}`, bestehend.id);
        continue;
      }
      const neu = await tx.budgetKategorie.create({
        data: { name, jahr, jahresbudget: 0, quelle: "migration", kategorie },
      });
      platzhalterIdByKey.set(`${jahr}|${kategorie}`, neu.id);
      platzhalterAngelegt++;
    }

    // Schritt B: IstKostenEintrag -> IstBuchung, verknüpft mit der passenden Platzhalter-Position.
    const ikeCreateResult = await tx.istBuchung.createMany({
      skipDuplicates: true,
      data: istKostenEintraege.map((r) => ({
        budgetPositionId: platzhalterIdByKey.get(`${r.datum.getUTCFullYear()}|${r.kategorie}`) ?? null,
        betrag: r.betrag,
        datum: r.datum,
        notiz: r.unterkategorie,
        erfassungsart: r.quelle === "finom_csv" ? "CSV_IMPORT" : "MANUELL",
        reKoBudgetRelevant: true,
        quelle: `migration:${r.quelle}`,
        dedupKey: `migration:ike:${r.id}`,
      })),
    });

    // Schritt C: BudgetAusgabe -> IstBuchung, bestehende granulare Zuordnung (kategorieId, ggf. null =
    // "nicht eingeplant") bleibt unverändert erhalten.
    const budgetAusgaben = await tx.budgetAusgabe.findMany();
    const baCreateResult = await tx.istBuchung.createMany({
      skipDuplicates: true,
      data: budgetAusgaben.map((r) => ({
        budgetPositionId: r.kategorieId,
        betrag: r.betrag,
        datum: r.datum,
        notiz: r.beschreibung,
        erfassungsart: r.quelle === "finom_import" ? "CSV_IMPORT" : "MANUELL",
        reKoBudgetRelevant: r.reKoBudgetRelevant,
        quelle: `migration:${r.quelle}`,
        dedupKey: `migration:ba:${r.id}`,
      })),
    });

    // Schritt D: FinomBuchungRohdaten mit der neuen IstBuchung verknüpfen (Brücke für Schritt 2 -
    // Import-Konsolidierung), sofern die Zeile ursprünglich einem IstKostenEintrag zugeordnet wurde.
    const rohdatenMitIke = await tx.finomBuchungRohdaten.findMany({
      where: { istKostenEintragId: { not: null }, istBuchungId: null },
      select: { id: true, istKostenEintragId: true },
    });
    for (const r of rohdatenMitIke) {
      const neueBuchung = await tx.istBuchung.findUnique({ where: { dedupKey: `migration:ike:${r.istKostenEintragId}` } });
      if (neueBuchung) {
        await tx.finomBuchungRohdaten.update({ where: { id: r.id }, data: { istBuchungId: neueBuchung.id } });
      }
    }

    return {
      platzhalterAngelegt,
      istKostenEintraegeMigriert: ikeCreateResult.count,
      budgetAusgabenMigriert: baCreateResult.count,
      uebersprungenDuplikat: istKostenEintraege.length + budgetAusgaben.length - ikeCreateResult.count - baCreateResult.count,
    };
  });

  await logAccess({
    userId: admin.id,
    action: "CREATE",
    entityType: "IstBuchung",
    details: `Datenmigration Betriebswirtschaftstool: ${ergebnis.istKostenEintraegeMigriert} Ist-Kosten-Einträge, ${ergebnis.budgetAusgabenMigriert} Budget-Ausgaben migriert, ${ergebnis.platzhalterAngelegt} Platzhalter-Positionen angelegt.`,
  });
  revalidatePath("/admin/budget-migration");
  return ergebnis;
}

export type ZuKlaerenPosition = { id: string; name: string; jahr: number; kategorie: KostenKategorie | null; anzahlBuchungen: number; summe: number };

/** Platzhalter-Positionen aus der Migration - Stefan sollte diese durchgehen: umbenennen/aufteilen in
 * echte granulare Positionen, oder ein Jahresbudget setzen, falls sie so bleiben sollen. */
export async function ladeZuKlaerenListe(): Promise<ZuKlaerenPosition[]> {
  await requireAdmin();
  const positionen = await prisma.budgetKategorie.findMany({
    where: { quelle: "migration" },
    orderBy: [{ jahr: "desc" }, { name: "asc" }],
  });

  const buchungen = await prisma.istBuchung.findMany({
    where: { budgetPositionId: { in: positionen.map((p) => p.id) } },
    select: { budgetPositionId: true, betrag: true },
  });
  const summeByPosition = new Map<string, { anzahl: number; summe: number }>();
  for (const b of buchungen) {
    const key = b.budgetPositionId!;
    const bestehend = summeByPosition.get(key) ?? { anzahl: 0, summe: 0 };
    bestehend.anzahl++;
    bestehend.summe += b.betrag.toNumber();
    summeByPosition.set(key, bestehend);
  }

  return positionen.map((p) => ({
    id: p.id,
    name: p.name,
    jahr: p.jahr,
    kategorie: p.kategorie,
    anzahlBuchungen: summeByPosition.get(p.id)?.anzahl ?? 0,
    summe: summeByPosition.get(p.id)?.summe ?? 0,
  }));
}
