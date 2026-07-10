import { db } from "../src/lib/db";

async function main() {
  const runs = await db.scraperRun.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5
  });
  console.log("Recent Scraper Runs:");
  for (const r of runs) {
    console.log(`- ID: ${r.id} | Status: ${r.status} | ResultsCount: ${r.resultsCount} | Error: ${r.errorMessage}`);
  }
}

main().catch(console.error).finally(() => process.exit(0));
