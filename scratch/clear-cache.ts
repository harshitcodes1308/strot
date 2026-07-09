import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log("Clearing ScraperRun and RawScraperResult caches...");
  await prisma.rawScraperResult.deleteMany({});
  await prisma.scraperRun.deleteMany({});
  console.log("Cache cleared!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
