import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  await prisma.settings.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton" },
  });

  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@praxis.de";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "ÄndernSie123!";

  const passwordHash = await bcrypt.hash(adminPassword, 12);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      name: "Admin",
      passwordHash,
      role: "ADMIN",
    },
  });

  const helpTypes = ["Sozialpädagogische Familienhilfe (SPFH)", "Erziehungsbeistandschaft", "Einzelbetreuung", "Tagesgruppe"];
  for (const name of helpTypes) {
    await prisma.helpType.upsert({ where: { name }, update: {}, create: { name } });
  }

  console.log(`Admin-Benutzer angelegt: ${admin.email} / Passwort: ${adminPassword}`);
  console.log("Bitte Passwort nach dem ersten Login ändern.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
