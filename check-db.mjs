import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const runs = await prisma.scraperRun.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5
  });
  console.log("Recent Runs:", JSON.stringify(runs, null, 2));

  const results = await prisma.rawScraperResult.findMany({
    orderBy: { processedAt: 'desc' },
    take: 5
  });
  console.log("Recent Results:", JSON.stringify(results.map(r => ({ id: r.id, source: r.source, scraperRunId: r.scraperRunId })), null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
