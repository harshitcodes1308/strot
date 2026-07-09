import { db } from "../src/lib/db";

async function main() {
  const runs = await db.scraperRun.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5
  });
  console.log("Recent Scraper Runs:");
  console.dir(runs, { depth: null });
  
  const results = await db.rawScraperResult.findMany({
    where: { scraperRunId: runs[0]?.id },
    take: 5
  });
  console.log("Raw results for latest run:");
  console.dir(results.map(r => r.source), { depth: null });
}

main().catch(console.error).finally(() => process.exit(0));
