import { PrismaClient } from "@prisma/client";
import { sections } from "./seedData/sections";
import { PILOT_DISTRICT_ID } from "./constants";

const prisma = new PrismaClient();

async function main() {
  await prisma.district.upsert({
    where: { id: PILOT_DISTRICT_ID },
    update: {},
    create: {
      id: PILOT_DISTRICT_ID,
      name: "Pilot District",
      state: "Tamil Nadu",
    },
  });
  console.log("Seeded pilot district.");

  for (const section of sections) {
    await prisma.knowledgeBaseSection.upsert({
      where: { id: section.id },
      update: section,
      create: section,
    });
  }
  console.log(`Seeded ${sections.length} knowledge base sections.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
