import { PrismaClient } from "@prisma/client";
import { sections } from "./seedData/sections";

const prisma = new PrismaClient();

async function main() {
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
