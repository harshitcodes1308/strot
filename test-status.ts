import "dotenv/config";
import { db } from "./src/lib/db";

async function run() {
  const latestRuns = await db.scraperRun.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5
  });
  console.log("Latest Runs:", JSON.stringify(latestRuns, null, 2));

  const rawResults = await db.rawScraperResult.count();
  console.log("Total Raw Results:", rawResults);

  const leads = await db.lead.count();
  console.log("Total Leads:", leads);
}

run().catch(console.error);
