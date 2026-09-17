import { PrismaClient } from "@prisma/client";
import { sections } from "./seedData/sections";
import { DISTRICTS } from "./constants";

const prisma = new PrismaClient();

async function main() {
  for (const d of DISTRICTS) {
    await prisma.district.upsert({
      where: { id: d.id },
      update: { name: d.name, state: d.state, slsaContact: d.slsaContact },
      create: { ...d },
    });
  }
  console.log(`Seeded ${DISTRICTS.length} districts.`);

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
