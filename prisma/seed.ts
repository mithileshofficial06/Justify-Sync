import { PrismaClient } from "@prisma/client";
import { sections } from "./seedData/sections";

const prisma = new PrismaClient();

// A single starting district so the app has somewhere for the first
// registration and bootstrap admin to attach to (v5 Stage 0). Rename or
// add more via the District table once real DLSA districts are onboarded.
export const PILOT_DISTRICT_ID = "pilot-district";

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
